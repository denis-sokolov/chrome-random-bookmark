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
    return {
      allDescendantsOfId: async folderId => flatten(await getSubTree(folderId)),
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
            "<a href='?folderId=" +
            encode(encodeURIComponent(b.id)) +
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
  const folderId = params.get("folderId");
  if (folderId) {
    const bookmarks = await api.allDescendantsOfId(folderId);
    const bookmark = random(
      bookmarks
        .filter(b => b.url)
        .filter(
          b => !b.url.includes(chrome.runtime.getURL("src/open/index.html"))
        )
    );
    if (!bookmark) throw new Error("No bookmarks in this folder");
    window.location.href = bookmark.url;
  } else {
    const div = document.createElement("div");
    div.innerHTML = treeHtml(await api.getFullTree());
    document.body.appendChild(div);
  }
})();
