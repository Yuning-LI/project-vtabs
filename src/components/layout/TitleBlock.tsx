type TitleBlockProps = {
  title: string
  meta: {
    key: string
    tempo: number
    meter: string
  }
}

/**
 * 歌曲标题区。
 *
 * 这块看起来简单，但交接时需要知道它承载的是“经过当前乐器适配后的元信息”，
 * 不是原始录谱数据的机械直出。
 *
 * 例如：
 * - `meta.key` 里的 `1 = Bb` 可能是经过当前音域适配后的结果
 * - 不是永远等于曲库存档里最初录入的 key
 *
 * 当前产品上，这一行元信息的作用是：
 * - 给用户一个快速的调 / 拍 / 速度 / 乐器上下文
 * - 让页面看起来像真正的谱页，而不是只有标题的练习卡片
 */
export default function TitleBlock({ title, meta }: TitleBlockProps) {
  return (
    <div className="px-4 pb-2 pt-6 text-center">
      <h1 className="text-3xl font-black leading-tight text-stone-900 md:text-[3.2rem]">
        {title}
      </h1>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm text-stone-600">
        <span className="font-medium text-stone-600">{meta.key}</span>
        <span className="text-stone-600">{meta.meter}</span>
        <span>♩ = {meta.tempo}</span>
        <span className="text-stone-600">•</span>
        <span>12-Hole AC</span>
      </div>
    </div>
  )
}
