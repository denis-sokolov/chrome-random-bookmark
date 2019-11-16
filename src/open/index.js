(function() {
  function encode(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function flatten(bookmarks) {
    return [bookmarks]
      .concat(bookmarks.map(b => (b.children ? flatten(b.children) : [])))
      .flat();
  }

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
    chrome.bookmarks.getSubTree(folderId, function(bookmarks) {
      const bookmark = random(
        flatten(bookmarks)
          .filter(b => b.url)
          .filter(
            b => !b.url.includes(chrome.runtime.getURL("src/open/index.html"))
          )
      );
      if (!bookmark) throw new Error("No bookmarks in this folder");
      window.location.href = bookmark.url;
    });
  } else {
    chrome.bookmarks.getTree(function(bookmarks) {
      // Chrome returns an empty top-level entry
      if (bookmarks.length === 1 && !bookmarks[0].title)
        bookmarks = bookmarks[0].children;

      const div = document.createElement("div");
      div.innerHTML = treeHtml(bookmarks);
      document.body.appendChild(div);
    });
  }
})();
