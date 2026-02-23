const fs = require('fs');
const { execSync } = require('child_process');

function exists(path) {
  return fs.existsSync(path);
}

console.log("🔍 正在检查 Hexo 项目结构...\n");

// 1. 检查根目录关键文件
if (!exists('./_config.yml')) {
  console.error("❌ 未找到 _config.yml，你不在 Hexo 根目录！");
  process.exit(1);
}

if (!exists('./package.json')) {
  console.error("❌ 未找到 package.json，你不在 Hexo 根目录！");
  process.exit(1);
}

if (!exists('./source')) {
  console.error("❌ 未找到 source/ 目录，你不在 Hexo 根目录！");
  process.exit(1);
}

if (!exists('./themes')) {
  console.error("❌ 未找到 themes/ 目录，你不在 Hexo 根目录！");
  process.exit(1);
}

console.log("✅ 根目录检查通过\n");

// 2. 检查 public 是否存在（如果不存在则自动生成）
if (!exists('./public')) {
  console.log("⚠️ 未找到 public/，正在自动执行 hexo g...\n");
  execSync('hexo generate', { stdio: 'inherit' });
} else {
  console.log("🔍 检查 public/ 是否需要重新生成...\n");
  execSync('hexo clean', { stdio: 'inherit' });
  execSync('hexo generate', { stdio: 'inherit' });
}

console.log("\n📦 public 生成完成\n");

// 3. 检查 deploy 配置
const config = fs.readFileSync('./_config.yml', 'utf8');
if (!config.includes('deploy:')) {
  console.error("❌ _config.yml 中未找到 deploy 配置，无法部署！");
  process.exit(1);
}

console.log("✅ 部署配置检查通过\n");

// 4. 最终确认
console.log("⚠️ 即将部署到线上，确认你要继续？(y/n)");

process.stdin.setEncoding('utf8');
process.stdin.on('data', (input) => {
  const answer = input.trim().toLowerCase();
  if (answer === 'y') {
    console.log("\n🚀 正在部署...\n");
    execSync('hexo deploy', { stdio: 'inherit' });
    console.log("\n🎉 部署完成！");
    process.exit(0);
  } else {
    console.log("🛑 已取消部署");
    process.exit(0);
  }
});
