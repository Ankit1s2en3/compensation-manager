import type { MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { DIRECTORY_PATH, cameFromDirectory } from '../paths';

/**
 * A real link to /employees (so it works opened in a new tab or after a
 * reload), but when the user arrived from the directory it goes back in
 * history instead, restoring their filters and page.
 */
export function BackToDirectoryLink() {
  const location = useLocation();
  const navigate = useNavigate();
  const fromDirectory = cameFromDirectory(location.state);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!fromDirectory || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    navigate(-1);
  }

  return (
    <Link
      to={DIRECTORY_PATH}
      onClick={handleClick}
      className="text-sm text-muted-foreground hover:text-foreground"
    >
      ← Back to employees
    </Link>
  );
}
