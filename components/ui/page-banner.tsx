import Image from 'next/image'

interface PageBannerProps {
  title: string
  description: string
  illustration: string
  illustrationAlt: string
}

export function PageBanner({ title, description, illustration, illustrationAlt }: PageBannerProps) {
  return (
    <div className="flex items-center gap-6 rounded-2xl bg-[#FAFAFA] dark:bg-[#0F0F0F] border border-dashed border-[#E0E0E0] dark:border-[#2C2C2C] px-8 py-6 mb-8">
      {/* Illustration */}
      <div className="shrink-0 w-[220px] h-[220px] bg-white rounded-2xl flex items-center justify-center overflow-hidden p-2">
        <Image
          src={illustration}
          alt={illustrationAlt}
          width={220}
          height={220}
          className="object-contain w-full h-full"
          priority
        />
      </div>
      {/* Text */}
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A1A] dark:text-white mb-1.5">{title}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-lg">{description}</p>
      </div>
    </div>
  )
}
