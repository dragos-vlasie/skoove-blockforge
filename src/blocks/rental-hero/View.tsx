const normalizePublicImagePath = (src = "") =>
  src.startsWith("public/") ? src.replace(/^public/, "") : src;

const getAvatars = (content: any) => {
  if (Array.isArray(content.avatars)) return content.avatars;
  if (Array.isArray(content.testimonials_avatars?.avatars)) return content.testimonials_avatars.avatars;
  return [];
};

const TestimonialsAvatars = ({ content }: { content: any }) => {
  const avatars = getAvatars(content).filter((image: any) => image?.src);
  const avatarNumber = content.avatarNumber ?? content.testimonials_avatars?.avatarNumber;
  const avatarLabel = content.avatarLabel ?? content.testimonials_avatars?.avatarLabel;

  if (!avatars.length && !avatarNumber && !avatarLabel) return null;

  return (
    <div className="flex flex-col items-center justify-center gap-4 md:flex-row md:items-start">
      {avatars.length > 0 && (
        <div className="flex -space-x-3">
          {avatars.map((image: any, index: number) => (
            <div
              className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-4 border-[color:var(--site-background)] bg-[var(--site-background)] shadow-sm"
              key={`${image.src}-${index}`}
            >
              <img
                src={normalizePublicImagePath(image.src)}
                alt={image.alt || "Vehicle"}
                className="h-full w-full object-cover"
                loading="eager"
                decoding="async"
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col items-center justify-center gap-1 md:items-start">
        <div className="rating flex">
          {[...Array(5)].map((_, index) => (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5 text-yellow-500"
              key={index}
            >
              <path
                fillRule="evenodd"
                d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"
                clipRule="evenodd"
              />
            </svg>
          ))}
        </div>
        {(avatarNumber || avatarLabel) && (
          <div className="text-base text-[var(--site-on-inverse)] opacity-80">
            {avatarNumber && <span className="font-semibold">{avatarNumber}</span>} {avatarLabel}
          </div>
        )}
      </div>
    </div>
  );
};

const StaticBookingForm = ({ content }: { content: any }) => {
  const controlClass = "w-full rounded-[var(--site-radius-sm)] border-2 border-[color:var(--site-border)] bg-[var(--site-background)] p-2 text-[var(--site-text)] shadow-md";

  return (
    <div className="h-fit w-full rounded-[var(--site-radius)] bg-[var(--site-inverse)] p-3 text-[var(--site-on-inverse)] shadow-lg">
      <div className="mx-auto w-full p-3">
        <div className="mt-2">
          <div className="text-left">
            <label className="mb-1 block">Pick-up Location</label>
            <select className={controlClass} value={content.pickupLocation || ""} onChange={() => undefined}>
              <option>{content.pickupLocation || "City Car Rent Office (Rua 31 de Janeiro)"}</option>
            </select>
          </div>
          <div className="text-left">
            <label className="mb-1 block">Drop-off Location</label>
            <select className={controlClass} value={content.dropoffLocation || ""} onChange={() => undefined}>
              <option>{content.dropoffLocation || "City Car Rent Office (Rua 31 de Janeiro)"}</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap sm:flex-nowrap sm:space-x-8">
          <div className="w-full text-left">
            <label className="mb-1 block">Pick-up Date and Time</label>
            <input className={controlClass} value={content.pickupDate || "12/06/2026 09:00"} readOnly />
          </div>
          <div className="w-full text-left">
            <label className="mb-1 block">Drop-off Date and Time</label>
            <input className={controlClass} value={content.dropoffDate || "13/06/2026 09:00"} readOnly />
          </div>
        </div>

        <div className="text-left">
          <a
            href="/booking/car-selection"
            className="mt-6 inline-flex min-w-36 items-center justify-center rounded-[var(--site-radius-sm)] bg-[var(--site-primary)] px-5 py-3 font-bold text-[var(--site-on-primary)] no-underline hover:bg-[var(--site-primary-strong)]"
          >
            {content.searchButtonText || "Search"}
          </a>
        </div>
      </div>
    </div>
  );
};

export function RentalHeroView({ content }: { content: any }) {
  const image = normalizePublicImagePath(content.imageUrl || content.bgImage || "/city-rent/12237905.jpg");

  return (
    <section style={{ backgroundImage: `url(${image})` }} className="bg-cover bg-center">
      <div className="bg-[var(--site-inverse)] opacity-95">
        <div className="mx-auto flex min-h-[700px] max-w-7xl flex-col items-center justify-center gap-16 px-8 py-8 text-[var(--site-on-inverse)] lg:flex-row lg:gap-20 lg:py-20">
          <div className="flex flex-col items-center justify-center gap-10 text-center lg:items-start lg:gap-14 lg:text-left">
            <h1 className="text-4xl font-extrabold tracking-tight md:-mb-4 lg:text-6xl">
              {content.heading}
            </h1>
            <p className="whitespace-pre-line text-lg leading-relaxed opacity-80">{content.description}</p>
            <TestimonialsAvatars content={content} />
          </div>
          <div className="w-full">
            <StaticBookingForm content={content} />
          </div>
        </div>
      </div>
    </section>
  );
}
