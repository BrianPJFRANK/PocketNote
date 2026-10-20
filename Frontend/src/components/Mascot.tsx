/**
 * 吉祥物佔位。之後把圖放到 src/assets/mascot/{pose}.png（或 webp、svg）就會自動換上。
 * pose 對應 Docs/mascot.md：greet、todo-empty、ledger-empty、memo-empty、
 * trash-empty、celebrate、worried、bust、blink、paw。鎖畫面沿用 greet，只是尺寸較小。
 * 分類小圖放到 src/assets/categories/{編號}.png，例如 exp.food.png、todo.work.png。
 */
const images = import.meta.glob('../assets/mascot/*.{png,webp,svg,jpg,jpeg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

export type MascotPose = 'greet' | 'todo-empty' | 'ledger-empty' | 'memo-empty' | 'trash-empty' | 'celebrate' | 'worried' | 'bust' | 'blink' | 'paw'

const face: Record<MascotPose, string> = {
  greet: '🐱',
  'todo-empty': '🐱',
  'ledger-empty': '🐱',
  'memo-empty': '🐱',
  'trash-empty': '🐱',
  celebrate: '🐱',
  worried: '😿',
  bust: '😺',
  blink: '😉',
  paw: '🐾',
}

const prop: Partial<Record<MascotPose, string>> = {
  greet: '👋',
  'todo-empty': '📋',
  'ledger-empty': '👛',
  'memo-empty': '✏️',
  'trash-empty': '📦',
  celebrate: '🎉',
  worried: '🧾',
}

function artwork(pose: MascotPose): string | undefined {
  const names = pose === 'greet' ? ['lock', 'greet'] : [pose]
  for (const name of names) {
    const hit = Object.entries(images).find(([path]) => {
      const file = path.replaceAll('\\', '/').split('/').pop() ?? ''
      return file.startsWith(`${name}.`)
    })
    if (hit) return hit[1]
  }
  return undefined
}

export function Mascot({ pose, size = 'md' }: { pose: MascotPose; size?: 'xl' | 'lg' | 'md' | 'sm' }) {
  const src = artwork(pose)
  return (
    <span className={`mascot ${size}`} data-pose={pose}>
      {src ? <img src={src} alt="" /> : <span className="mascot-face">{face[pose]}</span>}
      {!src && prop[pose] ? <span className="mascot-prop">{prop[pose]}</span> : null}
    </span>
  )
}
