import { getAsText, type Segment } from '../utils/flagConversionUtils'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClone } from '@fortawesome/free-solid-svg-icons'
import { useState } from 'react';

export default function CopyToClipboard({ segments }: { segments: Segment[] }) {
const [text, setText] = useState('Copy text');

const handleClick = () => {
    const text = getAsText(segments);
    navigator.clipboard.writeText(text);
    setText('Copied!'); 
    setTimeout(() => setText('Copy text'), 2000);
  };

  return (
    <button onClick={handleClick}>
      <FontAwesomeIcon icon={faClone} />
      {text}
    </button>
  )
}