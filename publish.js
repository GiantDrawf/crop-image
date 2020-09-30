const shelljs = require('shelljs');
const inquirer = require('inquirer');

// 判定git命令是否可用
if (!shelljs.which('git')) {
  // 向命令行打印git命令不可用的提示信息
  shelljs.echo('Sorry, this script requires git');
  // 退出当前进程
  shelljs.exit(1);
}

let gitBranchName = '';
console.log('current branch : ');
const getCurrentBranch = shelljs.exec('git symbolic-ref --short -q HEAD');

if (getCurrentBranch.code !== 0) {
  shelljs.exit();
}

gitBranchName = getCurrentBranch.output.replace('\n', '');

let userInputVersionType = '';
let userInputVersionDesc = '';
const masterVersionChoices = [
  { value: 'major', name: '主版本号' },
  { value: 'minor', name: '次版本号' },
  { value: 'patch', name: '补丁号' }
];
const testVersionChoices = [
  { value: 'premajor', name: '预备主版本' },
  { value: 'prepatch', name: '预备次版本' },
  { value: 'prerelease', name: '预发布版本' }
];
const generatorWhiteSpace = (needLength) => {
  const spaces = [];
  for (let i = 0; i < needLength; i++) {
    spaces.push(' ');
  }
  return spaces.join('');
};
const generateVersionLine = () => {
  const versionChoices =
    gitBranchName === 'master' ? masterVersionChoices : testVersionChoices;
  versionChoices.forEach((item) => {
    item.name = `${item.value}${generatorWhiteSpace(
      30 - item.value.length - item.name.length
    )}${item.name}`;
  });
  return versionChoices;
};
inquirer
  .prompt([
    {
      type: 'list',
      name: 'inputVersion',
      message: '请选择修订版本: ',

      default: true,
      choices: generateVersionLine()
    },
    {
      type: 'input',
      name: 'inputDesc',
      message: 'commit msg: '
    }
  ])
  .then((answers) => {
    userInputVersionType = answers.inputVersion;
    userInputVersionDesc = answers.inputDesc;

    const makeTag = shelljs.exec(
      `npm version ${userInputVersionType} -m 'Upgrade to v%s${
        userInputVersionDesc ? ` for ${userInputVersionDesc}` : ''
      }'`
    );
    if (makeTag.code !== 0) {
      shelljs.exit();
    }
    shelljs.exec('git push -u origin --tags && git push');

    shelljs.exit();
  })
  .catch((err) => {
    console.error(err);
    shelljs.exit();
  });
