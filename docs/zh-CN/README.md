<div align="center">
  <h1>Bifrost 彩虹桥</h1>
  <img src="https://github.com/AhMisty/senators-bifrost/blob/main/logo.svg?raw=true" width="30%"/>
  
  [![npm version](https://img.shields.io/npm/v/@senators/bifrost.svg?style=flat-square)](https://www.npmjs.com/package/@senators/bifrost)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://github.com/AhMisty/senators-bifrost/blob/main/LICENSE)
  [![npm downloads](https://img.shields.io/npm/dm/@senators/bifrost.svg?style=flat-square)](https://www.npmjs.com/package/@senators/bifrost)
  
  [English](https://github.com/AhMisty/senators-bifrost/blob/main/docs/en-US/README.md) | <span style="color: #999">中文</span>
</div>

> 🚀 一个强大的 TypeScript 库，用于与 OGame 游戏服务器进行自动化交互，让您的星际征途更加轻松！

## ✨ 功能特性

- 🛡️ 完整的 OGame API 封装
- 🔐 安全的账号登录和会话管理
- 🚀 强大的舰队操作管理
- 🌍 完善的行星和资源管理系统
- 🏗️ 建筑和科技队列控制
- 🛠️ 类型安全的 API 设计
- ⚡ 高性能的请求处理
- 🔄 实时数据更新和事件钩子

## 🚀 快速开始

### 安装

```bash
# 使用 npm
npm install @senators/bifrost

# 使用 yarn
yarn add @senators/bifrost

# 使用 pnpm
pnpm add @senators/bifrost
```

### 基础使用

```typescript
import { Operator, Courier, Config } from '@senators/bifrost'

// 创建配置
const config = new Config()

// 创建 HTTP 客户端
const courier = new Courier('https://example.com', 10000)

// 创建操作员实例
const operator = new Operator(
  1, // 宇宙编号
  'username', // 用户名
  'password', // 密码
  courier,
  config,
)

// 可选，添加钩子函数
operator.onUpdateControl = async (_operator) => {
  console.log('正在更新总览数据')
}
operator.onUpdateResearch = async (_operator) => {
  console.log('正在更新研究数据')
}
operator.onUpdatePlanets = async (_operator) => {
  console.log('正在更新行星数据')
}
// ......
operator.onUpdatePlanetBuilding = async (_operator, planet) => {
  console.log(`正在更新行星${planet.name}[${planet.coordinate.toString()}]的建筑数据`)
}
operator.onUpdatePlanetShipyard = async (_operator, planet) => {
  console.log(`正在更新行星${planet.name}[${planet.coordinate.toString()}]的船坞数据`)
}
// ......

// 更新游戏数据（自动处理登录）
await operator.update()

// 访问游戏数据
console.log(operator)
```

## 🚀 舰队任务示例

以下是一个完整的舰队任务示例，展示如何发送探险舰队：

```typescript
import { Operator, Courier, Config, Fleet, Elements } from '@senators/bifrost'

// 初始化配置和客户端
const config = new Config()
const courier = new Courier('https://example.com', 10000)

// 创建操作员
const operator = new Operator(1, 'username', 'password', courier, config)

// 配置舰队
const ships = new Elements()
ships.set(210, 99999) // 设置舰船类型210，数量99999艘

// 创建舰队任务
const fleet = new Fleet({
  cp: 1, // 起点星球ID
  galaxy: 1, // 目标河系
  system: 1, // 目标星系
  planet: 1, // 目标星球
  type: 1, // 星球类型：1=行星
  mission: 15, // 任务类型：15=探险
  speed: 10, // 速度：10=最快
  staytime: 1, // 停留时间：1小时
  metal: 0, // 金属：0
  crystal: 0, // 晶体：0
  deuterium: 0, // 重氢：0
  ships, // 舰船配置
})

// 执行舰队任务
console.log('发送舰队中...')
await operator.sendFleet(fleet)
console.log('舰队已派出！')

// 定时执行（可选）
const INTERVAL_MINUTES = 20
setInterval(
  async () => {
    console.log(`执行舰队任务 ${new Date().toLocaleTimeString()}`)
    await operator.sendFleet(fleet)
  },
  1000 * 60 * INTERVAL_MINUTES,
)
```

### 🎯 任务类型 (FleetMission)

| 值  | 类型 | 描述           |
| --- | ---- | -------------- |
| 1   | 攻击 | 对目标发起攻击 |
| 2   | 联盟 | 联盟任务       |
| 3   | 运输 | 运输资源       |
| 4   | 部署 | 部署舰队       |
| 5   | 持留 | 在轨道停留     |
| 6   | 间谍 | 间谍探测       |
| 7   | 殖民 | 建立殖民地     |
| 8   | 收集 | 收集资源       |
| 9   | 摧毁 | 摧毁月球       |
| 10  | 导弹 | 发射导弹       |
| 11  | 侦察 | 侦察任务       |
| 15  | 探险 | 深空探险       |
| 18  | 贸易 | 贸易任务       |

## 🧩 核心模块

| 模块               | 描述                                   |
| ------------------ | -------------------------------------- |
| **Operator**       | 🧠 核心操作类，处理登录和游戏内操作    |
| **Courier**        | 🌐 HTTP 请求处理，负责与游戏服务器通信 |
| **Fleet**          | 🚀 舰队管理，创建和执行舰队任务        |
| **Planets/Planet** | 🌍 行星管理系统，管理所有殖民星        |
| **Elements**       | 🏗️ 游戏内元素（资源、建筑、研究等）    |
| **Queue**          | ⏳ 队列管理，处理建筑和研究队列        |
| **Config**         | ⚙️ 配置管理，自定义客户端行为          |

## 🛠️ 开发指南

### 构建项目

```bash
# 安装依赖
npm install

# 构建项目
npm run build
```

### 代码规范

```bash
# 检查代码规范
npm run lint

# 格式化代码
npm run fmt
```

## 📜 许可证

本项目采用 [MIT 许可证](https://github.com/AhMisty/senators-bifrost/blob/main/LICENSE) 开源，您可以自由地使用、修改和分发本项目的代码。

## 🙏 致谢

- [OGame](https://ogame.gameforge.com) - 一个令人着迷的太空策略游戏
- 所有贡献者 - 感谢您的宝贵贡献！

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开 Pull Request

## 📞 联系方式

如有问题或建议，请通过 [GitHub Issues](https://github.com/AhMisty/senators-bifrost/issues) 提交。

---

<div align="center">
  <p>使用 <a href="https://github.com/rolldown/rolldown">Rolldown</a> 构建 | © 2025 Bifrost 项目</p>
</div>
