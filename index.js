#!/usr/bin/env node

'use strict';

import { resolve as _resolve, join } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync, createWriteStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { tmpdir } from 'node:os';
import { Command } from 'commander';
import chalk from 'chalk';
import { sync } from 'cross-spawn';
import ora from 'ora';
import { x as tarExtract } from 'tar';

const createLog = (tag) => (message) => console.log(`${tag} ${message}`);

const TAGS = {
  INFO: chalk.bgMagentaBright.black.bold('  INFO   '),
  PROCESS: chalk.bgYellow.black.bold(' PROCESS '),
  SUCCESS: chalk.bgGreen.white.bold(' SUCCESS '),
  ERROR: chalk.bgRed.white.bold('  ERROR  '),
};

const logInfo = createLog(TAGS.INFO);
const logError = createLog(TAGS.ERROR);

const TEMPLATE_MAP = {
  next: 'next-app',
  react: 'react-app',
  ethereum: 'ethereum-dapp',
  astro: 'astro-app',
  extension: 'extension',
  ui: 'ui-kit',
};

const TARBALL_URL =
  'https://codeload.github.com/StyleList94/stylish-app-kit/tar.gz/main';

function isValidTemplate(template) {
  return template in TEMPLATE_MAP;
}

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

function execCommand(command, args, options = { silent: false }) {
  const result = sync(command, args, {
    stdio: options.silent ? 'ignore' : 'inherit',
  });

  if (result.status !== 0) {
    logError(`Command failed: ${command}`);
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
    logError(`Run command failed: ${error}`);
    process.exit(1);
  }
}

function getStartScript(template) {
  const packageManager = getPackageManager();

  switch (template) {
    case 'react':
    case 'next':
    case 'ethereum':
    case 'astro':
    case 'ui':
      return `${packageManager} run dev`;
    case 'extension':
      return `${packageManager} run build`;
    default:
      return '';
  }
}

function validateTemplate(template, packageInfo) {
  if (!isValidTemplate(template)) {
    logError(`Template "${template}" not found`);
    console.log();
    console.log(
      `Run ${chalk.cyan(`${packageInfo.name} --help`)} to see all options.`
    );
    process.exit(1);
  }
}

function createProjectDirectory(appName, template) {
  const cwd = process.cwd();
  const appPath = join(cwd, appName);

  logInfo(
    `Creating ${chalk.cyan(`stylish-${template}-app`)} in ${chalk.green(
      appPath
    )}`
  );

  try {
    mkdirSync(appPath);
  } catch (error) {
    if (error.code === 'EEXIST') {
      logError(`Directory "${appName}" already exists`);
    } else {
      logError(`${error}`);
    }
    process.exit(1);
  }

  return appPath;
}

async function downloadTarball() {
  const tempFile = join(tmpdir(), `stylish-template-${Date.now()}.tar.gz`);

  const response = await fetch(TARBALL_URL);
  if (!response.ok) {
    throw new Error(`Failed to download template: ${response.statusText}`);
  }

  await pipeline(Readable.fromWeb(response.body), createWriteStream(tempFile));

  return tempFile;
}

async function extractTemplate(tarFile, template, destPath) {
  const templateDir = TEMPLATE_MAP[template];
  const prefix = `stylish-app-kit-main/templates/${templateDir}/`;

  await tarExtract({
    file: tarFile,
    cwd: destPath,
    strip: 3,
    filter: (path) => path.startsWith(prefix),
  });
}

async function downloadAndExtractTemplate(appName, template) {
  const appPath = createProjectDirectory(appName, template);

  const spinner = ora({
    text: 'Downloading template...',
    prefixText: TAGS.PROCESS,
  }).start();

  let tarFile;

  try {
    tarFile = await downloadTarball();
    spinner.text = 'Extracting template...';
    await extractTemplate(tarFile, template, appPath);

    process.chdir(appPath);
    buildPackageJson(_resolve(process.cwd(), 'package.json'), appName);

    spinner.prefixText = TAGS.SUCCESS;
    spinner.succeed('Downloaded template');
  } catch (error) {
    spinner.prefixText = TAGS.ERROR;
    spinner.fail('Failed to download template');
    throw error;
  } finally {
    if (tarFile) {
      await unlink(tarFile).catch(() => {});
    }
  }
}

function installDependencies() {
  const packageManager = getPackageManager();

  let executeModule = 'npx';
  const removeLockfileArgs = ['rimraf', './pnpm-lock.yaml'];

  const isExecFromPnpm = packageManager === 'pnpm';
  if (isExecFromPnpm) {
    executeModule = 'pnpm';
    removeLockfileArgs.unshift('dlx');
  }

  if (packageManager !== 'pnpm') {
    execCommand(executeModule, removeLockfileArgs, { silent: true });
  }

  const spinner = ora({
    text: 'Installing dependencies...',
    prefixText: TAGS.PROCESS,
    discardStdin: false,
  }).start();

  try {
    console.log();
    execCommand(packageManager, ['install']);
    spinner.stopAndPersist({
      symbol: chalk.green('✔'),
      prefixText: TAGS.SUCCESS,
      text: 'Installed dependencies',
    });
  } catch (error) {
    spinner.stopAndPersist({
      symbol: chalk.red('✖'),
      prefixText: TAGS.ERROR,
      text: 'Failed to install dependencies',
    });
    throw error;
  }
}

function initializeGitRepository() {
  const spinner = ora({
    text: 'Initializing repository...',
    prefixText: TAGS.PROCESS,
  }).start();

  try {
    execCommand('git', ['init'], { silent: true });
    execCommand('git', ['add', '.'], { silent: true });
    execCommand('git', ['commit', '-m', 'initial commit'], { silent: true });
    execCommand('git', ['branch', '-m', 'main'], { silent: true });
    spinner.prefixText = TAGS.SUCCESS;
    spinner.succeed('Initialized repository');
  } catch (error) {
    spinner.prefixText = TAGS.ERROR;
    spinner.fail('Failed to initialize repository');
    throw error;
  }
}

function showCompletionMessage(appName, template) {
  console.log();
  console.log(
    `${chalk.green.bold('  ✨ Success!')}${chalk.white(
      ' Your stylish app is ready'
    )}`
  );
  console.log();
  console.log(chalk.gray('  Next steps:'));
  console.log(chalk.cyan(`    cd ${appName}`));
  console.log(chalk.cyan(`    ${getStartScript(template)}`));
  console.log();
}

async function run(appName, packageInfo, template) {
  validateTemplate(template, packageInfo);

  await downloadAndExtractTemplate(appName, template);
  installDependencies();
  initializeGitRepository();
  showCompletionMessage(appName, template);
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
      '-t, --template [next, react, ethereum, astro, extension, ui]',
      'template name',
      'next'
    )
    .action((name) => {
      appName = name;
    })
    .allowUnknownOption()
    .parse(process.argv);

  if (typeof appName === 'undefined') {
    console.error('Please specify a project name:');
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
