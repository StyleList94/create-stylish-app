#!/usr/bin/env node

'use strict';

import { resolve as _resolve, join } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { get } from 'node:https';
import { Command } from 'commander';
import chalk from 'chalk';
import { sync } from 'cross-spawn';

const getRepository = (template) => {
  const repositoryAliasMap = {
    react: 'react-app',
    next: 'next-app',
    vanilla: 'vanilla-app',
    ethereum: 'ethereum-dapp',
    web: 'web-app',
    'pure-react': 'pure-react-app',
    extension: 'extension',
  };

  if (!repositoryAliasMap[template]) {
    throw new Error(`Template ${template} is not valid`);
  }
  return `https://github.com/StyleList94/stylish-${repositoryAliasMap[template]}`;
};

function getPackageManager() {
  const userAgent = process.env.npm_config_user_agent || '';

  if (userAgent.startsWith('yarn')) {
    return 'yarn';
  }

  if (userAgent.startsWith('pnpm')) {
    return 'pnpm';
  }

  if (userAgent.startsWith('bun')) {
    return 'bun';
  }

  return 'npm';
}

function checkForValidTemplate(template) {
  return new Promise((resolve, reject) => {
    const repository = getRepository(template);
    get(repository, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
    }).on('error', (e) => {
      reject(e);
    });
  });
}

function execCommand(command, args, options = { silent: false }) {
  const result = sync(command, args, {
    stdio: options.silent ? 'ignore' : 'inherit',
  });

  if (result.status !== 0) {
    console.error(`${chalk.red('Command failed:')} ${command}`);
    process.exit(1);
  }
}

function buildPackageJson(packageJsonPath, appName) {
  try {
    const fileContent = readFileSync(packageJsonPath, 'utf-8');
    const projectPackageJson = JSON.parse(fileContent);

    const { description, author, ...nextPackageJson } = projectPackageJson;

    Object.assign(nextPackageJson, {
      name: appName,
      version: '0.1.0',
    });

    writeFileSync(
      _resolve(process.cwd(), 'package.json'),
      JSON.stringify(nextPackageJson, null, 2),
      'utf8'
    );
  } catch (error) {
    console.log('Run command failed:', error);
    process.exit(1);
  }
}

function getStartScript(template) {
  const packageManager = getPackageManager();

  switch (template) {
    case 'react':
    case 'next':
    case 'vanilla':
    case 'ethereum':
    case 'web':
    case 'pure-react':
      return `${packageManager} run dev`;
    case 'extension':
      return `${packageManager} run build`;
    default:
      return '';
  }
}

async function run(appName, packageInfo, template) {
  function printInvalidTemplateMessage(template, packageInfo) {
    console.error(`Template ${chalk.bold(template)} is not valid`);
    console.log();
    console.log(
      `Run ${chalk.cyan(`${packageInfo.name} --help`)} to see all options.`
    );
    process.exit(1);
  }

  try {
    const isValidTemplate = await checkForValidTemplate(template);
    if (!isValidTemplate) {
      printInvalidTemplateMessage(template, packageInfo);
    }
  } catch (error) {
    printInvalidTemplateMessage(template, packageInfo);
  }

  const cwd = process.cwd();
  const appPath = join(cwd, appName);
  const repository = `${getRepository(template)}.git`;

  console.log(`\nCreating a new ${chalk.cyan(`stylish-${template}-app`)}`);
  console.log(`in ${chalk.green(appPath)}\n`);
  try {
    mkdirSync(appPath);
  } catch (error) {
    if (error.code === 'EEXIST') {
      console.log(
        `${chalk.bgRed('Error!')}\nThe app name ${chalk.bold(
          appName
        )} is already exist in the current directory, please change app name.\n`
      );
    } else {
      console.log(error);
    }
    process.exit(1);
  }
  process.stdout.write(`\nClone repository...`);
  execCommand('git', ['clone', '--depth=1', repository, appName], {
    silent: true,
  });
  process.chdir(appPath);
  buildPackageJson(_resolve(process.cwd(), 'package.json'), appName);
  console.log(` Done!\n`);

  const packageManager = getPackageManager();

  let executeModule = 'npx';
  const removeLockfileArgs = ['rimraf', './pnpm-lock.yaml'];
  const removeGitArgs = ['rimraf', './.git'];

  const isExecFromPnpm = packageManager === 'pnpm';
  if (isExecFromPnpm) {
    executeModule = 'pnpm';
    removeLockfileArgs.unshift('dlx');
    removeGitArgs.unshift('dlx');
  }

  if (packageManager !== 'pnpm') {
    execCommand(executeModule, removeLockfileArgs, { silent: true });
  }

  console.log(`Run ${chalk.cyan.italic(`${packageManager} install`)}...\n`);
  execCommand(packageManager, ['install']);

  console.log(`\nInitializing git...\n`);

  execCommand(executeModule, removeGitArgs, { silent: true });
  execCommand('git', ['init'], { silent: true });
  execCommand('git', ['add', '.'], { silent: true });
  execCommand('git', ['commit', '-m', 'initial commit'], { silent: true });
  execCommand('git', ['branch', '-m', 'main'], { silent: true });

  console.log(`\nAll Done!\n`);
  console.log('Run the following commands to get started:\n');
  console.log(`  ${chalk.cyan('cd')} ${appName}`);
  console.log(`  ${chalk.cyan(getStartScript(template))}`);
  console.log();
}

function init() {
  let appName;

  const packageInfo = JSON.parse(
    readFileSync(new URL('./package.json', import.meta.url), 'utf8')
  );

  const program = new Command(packageInfo.name);

  program
    .description(chalk.cyan('Create Stylish JavaScript web app'))
    .version(packageInfo.version, '-v, --version')
    .arguments('[app-name]')
    .usage('<app-name> [options]')
    .option(
      '-t, --template [next, ethereum, react, extension, pure-react, vanilla, web]',
      'template name',
      'next'
    )
    .action((name) => {
      appName = name;
    })
    .allowUnknownOption()
    .parse(process.argv);

  if (typeof appName === 'undefined') {
    console.error('Please specify the project directory:');
    console.log(`  ${chalk.cyan(program.name())} ${chalk.green('<app-name>')}`);
    console.log();
    console.log('For example:');
    console.log(
      `  ${chalk.cyan(program.name())} ${chalk.green('stylish-app')}`
    );
    console.log();
    console.log(
      `Run ${chalk.cyan(`${program.name()} --help`)} to see all options.`
    );
    process.exit(1);
  }

  const options = program.opts();

  run(appName, packageInfo, options.template);
}

init();
