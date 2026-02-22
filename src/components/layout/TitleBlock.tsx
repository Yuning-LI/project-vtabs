type TitleBlockProps = {
  title: string
  meta: {
    key: string
    tempo: number
  }
}

export default function TitleBlock({ title, meta }: TitleBlockProps) {
  return (
    <div className="bg-bg px-4 pt-4 pb-2">
      <h1 className="text-3xl md:text-4xl font-bold italic text-primary leading-tight">
        {title}
      </h1>
      <div className="flex gap-4 text-wood-dark text-sm mt-1">
        <span>Key: {meta.key}</span>
        <span>♩ = {meta.tempo}</span>
      </div>
    </div>
  )
}
