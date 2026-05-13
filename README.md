# ResearchHub - Zotero 7 科研效率插件

一款面向科研人员的 Zotero 7 侧边栏插件，集成打卡、番茄钟、AI 写作润色、翻译、邮件模板、作图技巧、LaTeX 片段等功能。

## 安装

1. 从 [Releases](https://github.com/wcg0726/zotero-researchhub/releases) 下载最新的 `.xpi` 文件
2. 在 Zotero 7 中：**工具 → 附加组件 → 齿轮图标 → 从文件安装附加组件**
3. 选择下载的 `.xpi` 文件
4. 安装后通过 **工具 → ResearchHub** 打开，或使用快捷键 `Ctrl+Shift+R`

## 功能概览

### 打卡系统
- 上下班打卡，记录工作时长
- 连续打卡天数统计（当前/最长/总计）
- 月历视图，打卡记录一目了然
- 段位等级系统：实习生 → 研究助理 → ... → 学术泰斗（8 个段位）
- XP 经验值积累，从打卡、番茄钟等活动中获取

### 番茄钟
- 可调时长的专注计时器（默认 25 分钟）
- 自动切换专注/休息模式
- 今日/总计番茄统计
- 历史记录

### AI 写作助手
- **28 个预设提示词模板**，覆盖 11 个分类：
  - 英文润色（通用/深度/SCI 级别）
  - 语法检查、冠词介词修正
  - 精简压缩、消除冗余
  - 学术句式升级、被动语态转换
  - 段落逻辑优化、Introduction 重组
  - 中译英（学术/逐句对照）
  - 投稿回复、Cover Letter
  - 中文学术润色、中文论文撰写
  - 热电材料专用模板
- 直接润色：学术/深度/SCI 三种风格
- 流式输出，实时显示润色结果
- 支持添加自定义提示词
- 润色历史记录

### 翻译工具
- 中英双向翻译
- 4 种翻译风格：学术、自然、正式、简洁
- 双文本区对照显示
- 一键复制结果

### 邮件模板
- **11 个学术邮件模板**，覆盖常见场景：
  - 投稿沟通（状态询问、审稿回复）
  - 导师沟通（进度询问、研究汇报）
  - 学术会议（注册、邀请回复）
  - 学术交流（合作者联系、访问学者、审稿邀请、论文合作）
- AI 邮件生成：输入场景和关键信息，自动生成专业邮件
- 支持添加自定义模板
- 一键复制

### 投稿流程
- 投稿清单（10 项检查，可勾选）
- 进度条可视化
- AI 期刊推荐：输入论文标题和摘要，推荐 3-5 个适合的期刊

### 作图技巧
- **19 个作图指南**，覆盖：
  - Origin 绘图（XRD、SEM/TEM、热电性能图）
  - Python 绘图（Matplotlib 配色、XRD 堆叠图、能带结构、态密度、声子谱）
  - PPT/文档（学术海报、组会 PPT）
  - 图片处理（SCI 标准、ImageJ）
  - 图表规范（Checklist）
  - COMSOL 导出
  - LaTeX 绘图（TikZ、pgfplots）
  - 图表选择指南、Graphical Abstract 制作
- AI 代码生成：描述图表需求，自动生成 Python 或 Origin 代码
- 支持添加自定义笔记

### LaTeX 片段
- **24 个常用 LaTeX 模板**：
  - 数学公式（行内/行间/矩阵/求和积分等）
  - 表格（三线表）
  - 图片（单图/并排图）
  - 引用、结构、算法、化学
  - 参考文献格式（natbib、BibTeX）
  - Beamer 幻灯片
- 搜索过滤
- 一键复制
- 支持添加自定义片段

### 生活助手
- **喝水打卡**：点击杯子图标记录每日饮水，可调目标
- **饮食推荐**：10 大分类、300+ 种食物随机推荐
  - 中餐（120+ 种，含八大菜系、小吃、甜品）
  - 西餐、日料、韩料、东南亚菜、印度菜、墨西哥菜
  - 甜点烘焙、饮品
- 饮食记录

### 名言与灵感
- 科学名言随机展示
- 灵感板：记录研究灵感
  - 颜色标记、标签分类
  - 置顶功能
  - 时间排序

### 设置
- AI API 配置（OpenAI / 自定义 API）
- 数据导出/导入（JSON 格式）
- 合并或覆盖导入模式

## 开发

```bash
# 安装依赖
npm install

# 开发构建（监听模式）
npx esbuild src/index.ts --bundle --outfile=addon/chrome/content/scripts/index.js --target=firefox115 --format=iife --platform=browser --watch

# 生产构建
npx esbuild src/index.ts --bundle --outfile=addon/chrome/content/scripts/index.js --target=firefox115 --format=iife --platform=browser

# 打包 .xpi
npm run package
```

## 项目结构

```
zotero-researchhub/
├── src/                           # TypeScript 源码
│   ├── index.ts                   # 入口
│   ├── prefs.ts                   # 偏好键定义
│   ├── modules/                   # 业务模块
│   │   ├── ai.ts                  # AI API 客户端
│   │   ├── checkin.ts             # 打卡逻辑
│   │   ├── rank.ts                # 等级系统
│   │   ├── pomodoro.ts            # 番茄钟
│   │   ├── writingAssistant.ts    # 写作润色
│   │   ├── emailTemplates.ts      # 邮件模板
│   │   ├── submission.ts          # 投稿流程
│   │   ├── plotTips.ts            # 作图技巧
│   │   ├── latexSnippets.ts       # LaTeX 片段
│   │   ├── lifeTracker.ts         # 喝水/饮食
│   │   ├── quotes.ts              # 名言/灵感
│   │   └── storage.ts             # 文件存储层
│   ├── ui/                        # UI 模块
│   │   ├── mainDialog.ts          # 标签页对话框
│   │   └── tabs/                  # 11 个标签页
│   └── data/                      # 静态数据
├── addon/                         # Zotero 插件资源
│   ├── manifest.json              # Zotero 7 清单
│   ├── bootstrap.js               # 生命周期
│   ├── prefs.js                   # 默认偏好
│   ├── chrome/content/            # XHTML + CSS + 图标
│   └── locale/                    # 中英文本地化
└── build/                         # 构建输出
```

## 技术栈

- **TypeScript** — 类型安全的源码
- **esbuild** — 快速打包（Firefox 115 目标）
- **Zotero Plugin API** — 原生集成
- **Fetch API** — AI 接口调用（支持流式输出）
- **Zotero.File** — 本地 JSON 文件持久化

## 数据存储

- **偏好设置**（AI 配置等）→ `Zotero.Prefs`，随 Zotero 同步
- **用户数据**（打卡记录、番茄钟统计等）→ `{Zotero 配置目录}/researchhub/*.json`

## 许可证

MIT License
