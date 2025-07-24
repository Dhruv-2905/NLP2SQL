import { JSX } from 'react';
import { marked } from 'marked';
const parseMarkdownToJSX = (markdownText: string): JSX.Element => {
  const html = marked.parse(markdownText);
  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        lineHeight: '1.6',
        marginTop: '20px',
      }}
    />
  );
};

export default parseMarkdownToJSX;