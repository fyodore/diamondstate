const iconProps = {
  viewBox: '0 0 24 24',
  width: 22,
  height: 22,
  'aria-hidden': true,
  focusable: false,
}

function FacebookIcon() {
  return (
    <svg {...iconProps}>
      <path
        fill="currentColor"
        d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14C17.18 2.1 16.05 2 14.86 2 12.04 2 10 3.72 10 7v2.5H7.5v4H10V22h4z"
      />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg {...iconProps}>
      <path
        fill="currentColor"
        d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm11 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
      />
    </svg>
  )
}

function ThreadsIcon() {
  return (
    <svg {...iconProps}>
      <path
        fill="currentColor"
        d="M16.55 11.2c-.1-2.2-1.85-3.55-4.65-3.55-1.65 0-3.05.55-3.95 1.5l1.35 1.15c.65-.7 1.6-1.1 2.6-1.1 1.7 0 2.7.75 2.8 2.05v.15c-.85-.35-1.85-.5-2.95-.5-2.35 0-4.15 1.15-4.15 3.2 0 1.95 1.7 3.15 4 3.15 1.4 0 2.55-.4 3.35-1.15.55.75 1.25 1.25 2.15 1.5l.85-1.55c-.55-.15-1-.5-1.35-1 .75-.95 1.15-2.2 1.05-3.85zm-4.1 4.15c-1.35 0-2.15-.6-2.15-1.5 0-.95.9-1.55 2.45-1.55.85 0 1.65.15 2.35.4-.15 1.75-1.2 2.65-2.65 2.65zM12.1 2C6.55 2 2.1 6.5 2.1 12.05S6.55 22.1 12.1 22.1s10-4.5 10-10.05S17.65 2 12.1 2zm0 18.1c-4.45 0-8.05-3.6-8.05-8.05S7.65 3.95 12.1 3.95s8.05 3.65 8.05 8.1-3.6 8.05-8.05 8.05z"
      />
    </svg>
  )
}

function XIcon() {
  return (
    <svg {...iconProps}>
      <path
        fill="currentColor"
        d="M3 3h5.2l4.05 5.7L17.7 3H21l-6.55 7.55L21.5 21h-5.2l-4.35-6.15L6.3 21H3l6.95-8.05L3 3zm3.15 1.7 11.7 14.6h1.95L8.05 4.7H6.15z"
      />
    </svg>
  )
}

function BlueskyIcon() {
  return (
    <svg {...iconProps}>
      <path
        fill="currentColor"
        d="M12 10.8c-1.15-2.25-4.25-6.45-7.15-8.5C2.65.85.9 1.65.9 4.2c0 1.65.9 6.95 7.55 12.35C9.7 17.5 10.85 18.4 12 19.15c1.15-.75 2.3-1.65 3.55-2.6 6.65-5.4 7.55-10.7 7.55-12.35 0-2.55-1.75-3.35-3.95-1.9-2.9 2.05-6 6.25-7.15 8.5z"
      />
    </svg>
  )
}

function YoutubeIcon() {
  return (
    <svg {...iconProps}>
      <path
        fill="currentColor"
        d="M23.5 7.2a3.05 3.05 0 0 0-2.15-2.15C19.5 4.55 12 4.55 12 4.55s-7.5 0-9.35.5A3.05 3.05 0 0 0 .5 7.2 31.9 31.9 0 0 0 0 12a31.9 31.9 0 0 0 .5 4.8 3.05 3.05 0 0 0 2.15 2.15c1.85.5 9.35.5 9.35.5s7.5 0 9.35-.5a3.05 3.05 0 0 0 2.15-2.15A31.9 31.9 0 0 0 24 12a31.9 31.9 0 0 0-.5-4.8zM9.75 15.5v-7L16 12l-6.25 3.5z"
      />
    </svg>
  )
}

export const SOCIAL_PLATFORMS = [
  { key: 'facebook_url', label: 'Facebook', Icon: FacebookIcon },
  { key: 'instagram_url', label: 'Instagram', Icon: InstagramIcon },
  { key: 'threads_url', label: 'Threads', Icon: ThreadsIcon },
  { key: 'x_url', label: 'X', Icon: XIcon },
  { key: 'bluesky_url', label: 'Bluesky', Icon: BlueskyIcon },
  { key: 'youtube_url', label: 'YouTube', Icon: YoutubeIcon },
]

export default function SocialLinks({ settings, className = '' }) {
  if (!settings) return null
  const links = SOCIAL_PLATFORMS.filter((platform) => settings[platform.key])
  if (!links.length) return null

  return (
    <div className={`social-links ${className}`.trim()} aria-label="Social media">
      {links.map(({ key, label, Icon }) => (
        <a
          key={key}
          href={settings[key]}
          className="social-link"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
        >
          <Icon />
        </a>
      ))}
    </div>
  )
}
