(async function() {
  const api = (function() {
    const promisify = f => (...args) =>
      new Promise(resolve => f(...args, resolve));
    const flatten = bookmarks =>
      [bookmarks]
        .concat(bookmarks.map(b => (b.children ? flatten(b.children) : [])))
        .flat();
    const getSubTree = promisify(chrome.bookmarks.getSubTree);
    const getTree = promisify(chrome.bookmarks.getTree);
    const search = promisify(chrome.bookmarks.search);
    return {
      allDescendantsOfTitle: async folderTitle => {
        // Search returns items without children
        const folders = await search({ title: folderTitle });
        const subtrees = (
          await Promise.all(folders.map(f => getSubTree(f.id)))
        ).flat();
        return flatten(subtrees);
      },
      getFullTree: async function() {
        const bookmarks = await getTree();
        // Chrome returns an empty top-level entry
        if (bookmarks.length === 1 && !bookmarks[0].title)
          return bookmarks[0].children;
        return bookmarks;
      }
    };
  })();

  const encode = str =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const random = list => list[Math.floor(Math.random() * list.length)];

  function addHtml(html) {
    const div = document.createElement("div");
    div.innerHTML = html;
    document.body.appendChild(div);
  }

  function treeHtml(bookmarks) {
    bookmarks = bookmarks.filter(
      b => !b.url || (b.children && b.children.length)
    );
    if (!bookmarks.length) return "";
    return (
      "<ul>" +
      bookmarks
        .map(function(b) {
          return (
            "<li>" +
            "<a href='?folderTitle=" +
            // Folder ids are not stable across Chrome bookmark sync
            encode(encodeURIComponent(b.title)) +
            "'>" +
            encode(b.title) +
            "</a>" +
            (b.children ? treeHtml(b.children) : "") +
            "</li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  const params = new URLSearchParams(window.location.search);
  const folderTitle = params.get("folderTitle");
  if (folderTitle) {
    const bookmarks = await api.allDescendantsOfTitle(folderTitle);
    const bookmark = random(
      bookmarks
        .filter(b => b.url)
        .filter(
          b => !b.url.includes(chrome.runtime.getURL("src/open/index.html"))
        )
    );
    if (bookmark) {
      window.location.href = bookmark.url;
    } else {
      addHtml(`<p>No bookmarks with title ${folderTitle} found.</p>`);
    }
  } else {
    addHtml(treeHtml(await api.getFullTree()));
  }
})();
