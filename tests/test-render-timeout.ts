import { createRenderLock } from '../src/lib/hooks/useRenderLock.ts'

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const run = async () => {
  let timedOut = false
  const { startRender } = createRenderLock(50)
  startRender(() => {
    timedOut = true
  })
  await wait(80)

  if (!timedOut) {
    console.error('❌ 超时测试失败：未触发超时回调')
    process.exitCode = 1
    return
  }

  timedOut = false
  const { startRender: startRender2, finishRender: finishRender2 } = createRenderLock(50)
  startRender2(() => {
    timedOut = true
  })
  finishRender2()
  await wait(80)

  if (timedOut) {
    console.error('❌ 超时测试失败：finishRender 后仍触发回调')
    process.exitCode = 1
    return
  }

  console.log('✅ 超时测试通过：超时触发与取消逻辑正常')
}

run()
