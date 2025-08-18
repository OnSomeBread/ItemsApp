// each page has its localStorage start with pageName- example: item-674d90b55704568fe60bc8f5
export function clearPageLocalStorage(page: string) {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(page)) localStorage.removeItem(key);
  }
}
