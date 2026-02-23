#!/bin/bash

# === 配置区域 ===

SOURCE_DIR="public"                     # 要备份的文件夹
BUCKET="thunder7-blog-backup"          # GCS bucket 名称
KEEP=5                                  # 保留最近 N 个备份（可修改）
DATE=$(date +"%Y-%m-%d_%H-%M-%S")       # 日期格式
FILENAME="public-backup-$DATE.tar.gz"   # 备份文件名

# === 1. 检查 public 是否存在 ===

if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ 错误：$SOURCE_DIR 文件夹不存在，无法备份。"
    exit 1
fi

echo "✔ 检查通过：$SOURCE_DIR 存在，开始备份..."

# === 2. 压缩 public 文件夹 ===

tar -czf $FILENAME $SOURCE_DIR

echo "✔ 已压缩为：$FILENAME"

# 显示文件大小
SIZE=$(du -h $FILENAME | cut -f1)
echo "📦 备份文件大小：$SIZE"

# === 3. 上传到 GCS ===

gsutil cp $FILENAME gs://$BUCKET/

echo "✔ 已上传到：gs://$BUCKET/$FILENAME"

# === 4. 删除本地临时文件 ===

rm $FILENAME
echo "✔ 本地临时文件已删除"

# === 5. 自动清理旧备份，只保留最近 N 个 ===

echo "🧹 正在清理旧备份，只保留最近 $KEEP 个..."

# 列出 bucket 中的备份文件（按时间排序）
FILES=$(gsutil ls gs://$BUCKET/ | sort)

COUNT=$(echo "$FILES" | wc -l)

if [ $COUNT -le $KEEP ]; then
    echo "✔ 当前备份数量 $COUNT 个，不需要清理。"
    exit 0
fi

# 需要删除的数量
DEL=$((COUNT - KEEP))

# 删除最旧的 DEL 个文件
echo "$FILES" | head -n $DEL | while read FILE; do
    gsutil rm "$FILE"
    echo "🗑 已删除旧备份：$FILE"
done

echo "✨ 清理完成，只保留最近 $KEEP 个备份。"
echo "🎉 手动备份完成！"

