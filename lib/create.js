const path = require("path");
const fs = require("fs-extra");

const inquirer = require("inquirer");
const chalk = require("chalk");
const Ora = require("ora");
const REMOTE_TYPE = require("./util/enum");
const logSymbols = require("log-symbols");

const validateProjectName = require("validate-npm-package-name");

const downloadFromRemote = require("./download");

module.exports = async function create(projectName) {
  const cwd = process.cwd();
  const targetDir = path.resolve(cwd, projectName);
  const name = path.relative(cwd, projectName);

  const result = validateProjectName(name);

  // 判断包名是否合法
  if (!result.validForNewPackages) {
    console.error(chalk.red(`Invaild project name "${name}"`));
    result.errors &&
      result.errors.forEach((err) => {
        console.error(chalk.red.dim("Error: " + err));
      });

    result.warnings &&
      result.warnings.forEach((warning) => {
        console.error(chalk.yellow.dim("Warning: " + warning));
      });

    process.exit(1);
  }

  // 判断同名文件夹是否已经存在
  if (fs.existsSync(targetDir)) {
    const { action } = await inquirer.prompt([
      {
        name: "action",
        type: "list",
        message: `Target dictionary ${chalk.cyan(
          targetDir
        )} already exists, Pick an action:`,
        choices: [
          { name: "Overwrite", value: "overwrite" },
          { name: "Cancel", value: false },
        ],
      },
    ]);
    if (!action) {
      return;
    } else if (action === "overwrite") {
      console.log(`\nRemoving ${chalk.cyan(targetDir)}...`);
      await fs.remove(targetDir);
    }
  }

  // 选择填入项目相关信息
  const {
    bolierplateType,
  } = await inquirer.prompt([
    {
      name: "bolierplateType",
      type: "list",
      default: "koa2",
      choices: [
        {
          name: "koa2",
          value: "koa2",
        },
        {
          name: "react",
          value: "react",
        },
        {
          name: 'vue',
          value: 'vue'
        },
      ],
      message: "Select the type of frame you want to use",
    },
    
  ]);

  const remoteUrl = REMOTE_TYPE[bolierplateType];
  if (!remoteUrl) {
    console.log(logSymbols.error, "Sorry, this part is still in developing...");
    return;
  }

  const {
    author,
    description,
    version,
  } = await inquirer.prompt([
    {
      type: "input",
      name: "description",
      message: "Please input your project description",
      default: "description",
      validate(val) {
        return true;
      },
      transformer(val) {
        return val;
      },
    },
    {
      type: "input",
      name: "author",
      message: "Please input your author name",
      default: "author",
      validate(val) {
        return true;
      },
      transformer(val) {
        return val;
      },
    },
    {
      type: "input",
      name: "version",
      message: "Please input your version",
      default: "0.0.1",
      validate(val) {
        return true;
      },
      transformer(val) {
        return val;
      },
    },
  ])

  console.log(
    logSymbols.success,
    `Creating template of project ${bolierplateType} in ${targetDir}`
  );
  const spinner = new Ora({
    text: `Download template from remote\n`,
  });

  spinner.start();
  // 从remote拉取代码
  downloadFromRemote(remoteUrl, projectName)
    .then((res) => {
      fs.readFile(
        `./${projectName}/package.json`,
        "utf-8",
        function (err, data) {
          if (err) {
            spinner.stop();
            console.log(err);
            return;
          }
          const packageJson = JSON.parse(data);
          packageJson.name = projectName;
          packageJson.description = description;
          packageJson.author = author;
          packageJson.version = version;

          let updatePackageJson = JSON.stringify(packageJson, null, 2);
          fs.writeFile(
            `./${projectName}/package.json`,
            updatePackageJson,
            "utf-8",
            function (err) {
              spinner.stop();
              if (err) {
                console.error(err);
              } else {
                console.log(
                  logSymbols.success,
                  chalk.green(
                    `Successfully created project template of ${bolierplateType}\n`
                  )
                );
                console.log(
                  `${chalk.blue(`cd ${projectName}`)} \n${chalk.blue(
                    "yarn install"
                  )}\n${chalk.blue("yarn start")}\n`
                );
                process.exit(1);
              }
            }
          );
        }
      );
    })
    .catch((err) => {
      console.log(logSymbols.error, err);
      spinner.fail(
        chalk.red("Sorry, it must be something error, please check it out. \n")
      );
      process.exit(1);
    });
};
