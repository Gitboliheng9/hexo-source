const fs = require('fs');
const { execSync } = require('child_process');

function exists(path) {
  return fs.existsSync(path);
}

function log(msg) {
  console.log(msg);
}

function run(cmd) {
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (err) {
    console.error(`❌ 命令执行失败：${cmd}`);
    process.exit(1);
  }
}

log("🔍 正在执行 Hexo 安全部署检查...\n");

/* ---------------------------------------------------------
   1. 检查是否在 Hexo 根目录
--------------------------------------------------------- */
if (!exists('./_config.yml') || !exists('./source') || !exists('./themes')) {
  console.error("❌ 你不在 Hexo 根目录，已阻止部署！");
  process.exit(1);
}

log("✅ 根目录检查通过\n");

/* ---------------------------------------------------------
   2. 检查 _config.yml 是否有 deploy 配置
--------------------------------------------------------- */
const config = fs.readFileSync('./_config.yml', 'utf8');
if (!config.includes('deploy:')) {
  console.error("❌ _config.yml 缺少 deploy 配置，无法部署！");
  process.exit(1);
}

log("✅ 部署配置检查通过\n");

/* ---------------------------------------------------------
   3. 检查主题是否存在
--------------------------------------------------------- */
const themeName = config.match(/theme:\s*(.*)/)?.[1]?.trim();
if (!themeName || !exists(`./themes/${themeName}`)) {
  console.error("❌ 主题目录不存在，无法部署！");
  process.exit(1);
}

log(`🎨 主题检查通过：${themeName}\n`);

/* ---------------------------------------------------------
   4. 检查文章 front-matter
--------------------------------------------------------- */
log("🔍 正在检查文章 front-matter...");

const postsDir = './source/_posts';
if (!exists(postsDir)) {
  console.error("❌ 未找到 source/_posts 目录！");
  process.exit(1);
}

const postFiles = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));
let badPosts = [];

postFiles.forEach(file => {
  const content = fs.readFileSync(`${postsDir}/${file}`, 'utf8');
  if (!content.startsWith('---')) {
    badPosts.push(file);
  }
});

if (badPosts.length > 0) {
  console.error("❌ 以下文章缺少 front-matter：");
  console.error(badPosts.join('\n'));
  process.exit(1);
}

log("✅ 所有文章 front-matter 正常\n");

/* ---------------------------------------------------------
   5. 检查 Firebase CLI
--------------------------------------------------------- */
log("🔍 正在检查 Firebase CLI...");

try {
  execSync('firebase --version', { stdio: 'ignore' });
  log("✅ Firebase CLI 已安装\n");
} catch {
  console.error("❌ 未安装 Firebase CLI，请先执行：npm install -g firebase-tools");
  process.exit(1);
}

/* ---------------------------------------------------------
   6. Hexo clean + generate
--------------------------------------------------------- */
log("🧹 正在执行 hexo clean...");
run('npx hexo clean');

log("⚙️ 正在执行 hexo generate...");
run('npx hexo generate');

if (!exists('./public') || fs.readdirSync('./public').length === 0) {
  console.error("❌ public 生成失败，目录为空，已阻止部署！");
  process.exit(1);
}

log("✅ public 生成成功\n");

/* ---------------------------------------------------------
   7. 最终确认
--------------------------------------------------------- */
log("⚠️ 即将部署到 Firebase，是否继续？(y/n)");

process.stdin.setEncoding('utf8');
process.stdin.on('data', (input) => {
  const answer = input.trim().toLowerCase();
  if (answer === 'y') {
    log("\n🚀 正在部署到 Firebase...\n");
    run('firebase deploy --only hosting');
    log("\n🎉 部署完成！网站已成功更新\n");
    process.exit(0);
  } else {
    log("🛑 已取消部署");
    process.exit(0);
  }
});
