// Service worker da extensão. Clique no ícone: na aba do WhatsApp Web abre ou
// recolhe a faixa (aba de antes da instalação é recarregada); em outra aba, vai
// para o WhatsApp Web.
const WA = "https://web.whatsapp.com/";

chrome.action.onClicked.addListener(async (abaAtual) => {
  if (abaAtual?.url?.startsWith(WA)) {
    try {
      await chrome.tabs.sendMessage(abaAtual.id, { nordic: "alternar" });
    } catch {
      await chrome.tabs.reload(abaAtual.id);
    }
    return;
  }
  const [aba] = await chrome.tabs.query({ url: `${WA}*` });
  if (!aba) {
    await chrome.tabs.create({ url: WA });
    return;
  }
  await chrome.tabs.update(aba.id, { active: true });
  await chrome.windows.update(aba.windowId, { focused: true });
});
