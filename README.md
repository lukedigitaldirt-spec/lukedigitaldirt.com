# lukedigitaldirt.com

This site is hosted with GitHub Pages at [lukedigitaldirt.com](https://lukedigitaldirt.com/). Changes merged to `main` are published from the repository root.

## Editing the site

- Most site text, navigation, and page sections live in `content/site.json`.
- Page shells are HTML files in the repository root. Styles and scripts live in `assets/`.
- The site editor is available at [lukedigitaldirt.com/admin.html](https://lukedigitaldirt.com/admin.html). It can preview edits and export JSON without signing in. When signed in, **Publish commits directly to the selected branch**, which defaults to `main`.

## Review changes before publishing

1. Create a branch from the latest `main` and make your changes there.
2. Preview the site locally by running `python3 -m http.server 8000` from the repository root and opening `http://localhost:8000/`. Stop the server with Ctrl+C.
3. Commit with a descriptive message, push the branch, and open a pull request targeting `main`.
4. Review the changes, then merge the pull request when ready to publish. Check the deployment under the repository's **Actions** tab and visit the site.

The site editor does not create pull requests automatically. To use it with this workflow, select an existing feature branch when signing in, publish to that branch, and then open a pull request.
