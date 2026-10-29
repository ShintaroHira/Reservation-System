import { Fragment } from 'react';

/**
 * Renders `\n` in content as the line breaks used by the design. The breaks
 * are hidden on phones (`.br-wide`) so short screens get natural wrapping;
 * the space before each break keeps words apart when it is hidden.
 */
export function MultilineText({ text }: { text: string }) {
  return text.split('\n').map((line, index) => (
    <Fragment key={index}>
      {index > 0 && (
        <>
          {' '}
          <br className="br-wide" />
        </>
      )}
      {line}
    </Fragment>
  ));
}
