import { useState } from 'react'
import PosterPlaceholder from '../../components/PosterPlaceholder.jsx'

const Poster = ({ src, title, type, className = '' }) => {
  const [failedSrc, setFailedSrc] = useState(null)

  if (failedSrc === src) return <PosterPlaceholder title={title} type={type} className={className} />

  return (
    <img
      className={className}
      src={src}
      alt={`Pôster de ${title}`}
      loading="lazy"
      width="342"
      height="513"
      onError={() => setFailedSrc(src)}
    />
  )
}

export default Poster
