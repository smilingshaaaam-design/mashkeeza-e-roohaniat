import Image from 'next/image'

const RING_LETTERS = ['ا', 'ب', 'ج', 'د', 'ه', 'و', 'ز', 'ح', 'ط', 'ی', 'ک', 'ل', 'م', 'ن']
const INNER_SYMBOLS = ['✦', '☽', '✧', '◈', '✦', '☽', '✧', '◈']

export function Mashk() {
  return (
    <>
      <div
        className="absolute"
        style={{
          left: '-12.6%',
          top: '35.7%',
          width: '47.1%',
          height: '60.6%',
          maskImage: 'radial-gradient(ellipse 22% 50% at 50% 49%, #000 70%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 22% 50% at 50% 49%, #000 70%, transparent 100%)',
        }}
      >
        <Image
          src="/images/mashk.png"
          alt="جادوئی حروف سے روشن قدرتی چمڑے کا مشکیزہ"
          fill
          sizes="60vw"
          className="object-cover"
        />
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute aspect-square -translate-x-1/2 -translate-y-1/2"
        style={{ left: '11%', top: '75.5%', width: '11cqw' }}
      >
        <span className="rune-aura absolute inset-[8%] rounded-full" />

        <div className="rune-ring absolute inset-0">
          {RING_LETTERS.map((letter, i) => (
            <span
              key={`${letter}-${i}`}
              className="rune-glyph absolute top-1/2 left-1/2 font-bold"
              style={{
                fontSize: '1.15cqw',
                lineHeight: 1,
                transform: `translate(-50%, -50%) rotate(${(360 / RING_LETTERS.length) * i}deg) translateY(-4.4cqw)`,
                animationDelay: `${(i * 0.25).toFixed(2)}s`,
              }}
            >
              {letter}
            </span>
          ))}
        </div>

        <div className="rune-ring-reverse absolute inset-[22%]">
          {INNER_SYMBOLS.map((symbol, i) => (
            <span
              key={`${symbol}-${i}`}
              className="rune-glyph rune-glyph-cool absolute top-1/2 left-1/2"
              style={{
                fontSize: '0.75cqw',
                lineHeight: 1,
                transform: `translate(-50%, -50%) rotate(${(360 / INNER_SYMBOLS.length) * i}deg) translateY(-2.4cqw)`,
                animationDelay: `${(i * 0.4).toFixed(2)}s`,
              }}
            >
              {symbol}
            </span>
          ))}
        </div>

        <span
          className="rune-glyph rune-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ fontSize: '3cqw', lineHeight: 1 }}
        >
          ۞
        </span>
      </div>
    </>
  )
}
