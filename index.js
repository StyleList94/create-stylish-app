#!/usr/bin/env node

'use strict';

const path = require('path');
const fs = require('fs');
const https = require('https');
const { Command } = require('commander');
const chalk = require('chalk');
const spawn = require('cross-spawn');
const packageJson = require('./package.json');

function checkForValidTemplate(template) {
  return new Promise((resolve, reject) => {
    https
      .get(`https://github.com/StyleList94/stylish-${template}-app`, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .on('error', (e) => {
        reject(e);
      });
  });
}

function execCommand(command, args, options = { silent: false }) {
  const result = spawn.sync(command, args, {
    stdio: options.silent ? 'ignore' : 'inherit',
  });

  if (result.status !== 0) {
    console.error(`${chalk.red('Command failed:')} ${command}`);
    process.exit(1);
  }
}

function buildPackageJson(packageJsonPath, appName) {
  try {
    const fileContent = fs.readFileSync(packageJsonPath, 'utf-8');
    const projectPackageJson = JSON.parse(fileContent);

    const { description, author, ...nextPackageJson } = projectPackageJson;

    Object.assign(nextPackageJson, {
      name: appName,
      version: '0.1.0',
    });

    fs.writeFileSync(
      path.resolve(process.cwd(), 'package.json'),
      JSON.stringify(nextPackageJson, null, 2),
      'utf8'
    );
  } catch (error) {
    console.log('Run command failed:', error);
    process.exit(1);
  }
}

function getStartScript(template) {
  switch (template) {
    case 'react':
      return 'yarn start';
    case 'next':
    case 'vanilla':
      return 'yarn dev';

    default:
      return '';
  }
}

async function run(appName, template) {
  try {
    const isValidTemplate = await checkForValidTemplate(template);
    if (!isValidTemplate) {
      console.error(`Template ${template} is not valid`);
      console.log();
      console.log(
        `Run ${chalk.cyan(`${packageJson.name} --help`)} to see all options.`
      );
      process.exit(1);
    }
  } catch (error) {
    console.log(error);
    process.exit(1);
  }

  const cwd = process.cwd();
  const appPath = path.join(cwd, appName);
  const repository = `https://github.com/StyleList94/stylish-${template}-app.git`;

  console.log(`Creating a new ${chalk.cyan(`stylish-${template}-app`)}`);
  console.log(`in ${chalk.green(appPath)}\n`);
  try {
    fs.mkdirSync(appPath);
  } catch (error) {
    if (error.code === 'EEXIST') {
      console.log(
        `Error\nThe app name ${appName} is already exist in the current directory, please change the app name.\n`
      );
    } else {
      console.log(error);
    }
    process.exit(1);
  }
  execCommand('git', ['clone', repository, appName], { silent: true });
  process.chdir(appPath);
  buildPackageJson(path.resolve(process.cwd(), 'package.json'), appName);

  console.log(
    `\nInstalling packages. This might take a couple of minutes...\n`
  );
  execCommand('yarn', ['install']);

  console.log(`\nInitializing git...\n`);
  execCommand('npx', ['rimraf', './.git'], { silent: true });
  execCommand('git', ['init'], { silent: true });
  execCommand('git', ['add', '.'], { silent: true });
  execCommand('git', ['commit', '-m', 'initial commit'], { silent: true });
  execCommand('git', ['branch', '-m', 'main'], { silent: true });

  console.log(`All done.\n`);
  console.log('Run the following commands to get started:\n');
  console.log(`  ${chalk.cyan('cd')} ${appName}`);
  console.log(`  ${chalk.cyan(getStartScript(template))}`);
  console.log();
}

function init() {
  let appName;

  const program = new Command(packageJson.name);

  program
    .description(chalk.cyan('Create Stylish JavaScript web app'))
    .version(packageJson.version, '-v, --version')
    .arguments('[app-name]')
    .usage('<app-name> [options]')
    .option('-t, --template [react, next, vanilla, web]', 'template name', 'react')
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

  run(appName, options.template);
}

init();
