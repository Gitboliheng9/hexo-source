const fs = require('fs');
const { execSync } = require('child_process');

function exists(path) {
  return fs.existsSync(path);
}

function log(msg) {
  console.log(msg);
}

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

log("🔍 正在执行 Hexo 企业级部署安全检查...\n");

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
   3. 检查主题是否完整
--------------------------------------------------------- */
const themeName = config.match(/theme:\s*(.*)/)?.[1]?.trim();
if (!themeName || !exists(`./themes/${themeName}`)) {
  console.error("❌ 主题目录不存在，无法部署！");
  process.exit(1);
}

log(`🎨 主题检查通过：${themeName}\n`);

/* ---------------------------------------------------------
   4. 检查文章 front-matter 是否缺失
--------------------------------------------------------- */
log("🔍 正在检查文章 front-matter...");

const postsDir = './source/_posts';
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
   5. 自动备份 public（本地）
--------------------------------------------------------- */
log("📦 正在备份当前 public 到 backup_public.zip...\n");

if (exists('./public')) {
  run('zip -r backup_public.zip public');
  log("✅ 本地 public 备份完成\n");
} else {
  log("⚠️ 未找到 public，跳过本地备份\n");
}

/* ---------------------------------------------------------
   6. 自动备份线上 Firebase 版本
--------------------------------------------------------- */
log("📡 正在检查 Firebase 登录状态...\n");

try {
  execSync('firebase login:list', { stdio: 'ignore' });
  log("✅ Firebase 已登录\n");
} catch {
  console.error("❌ Firebase 未登录，请先执行：firebase login");
  process.exit(1);
}

log("📦 正在备份线上版本（firebase hosting:clone）...\n");

try {
  run('firebase hosting:clone live-backup --from default');
  log("✅ 线上版本备份完成\n");
} catch {
  log("⚠️ 无法备份线上版本（可能未启用 hosting:clone），继续部署\n");
}

/* ---------------------------------------------------------
   7. 自动 clean + generate
--------------------------------------------------------- */
log("🧹 正在执行 hexo clean...");
run('hexo clean');

log("⚙️ 正在执行 hexo generate...");
run('hexo generate');

if (!exists('./public') || fs.readdirSync('./public').length === 0) {
  console.error("❌ public 生成失败，目录为空，已阻止部署！");
  process.exit(1);
}

log("✅ public 生成成功\n");

/* ---------------------------------------------------------
   8. 最终确认
--------------------------------------------------------- */
log("⚠️ 即将部署到线上，是否继续？(y/n)");

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
