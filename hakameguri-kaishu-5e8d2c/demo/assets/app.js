(function () {
  "use strict";
  const site = window.SITE;
  const entries = (window.REIEN_LIST || []).filter((item) => item.publish);
  const app = document.getElementById("app");
  const page = document.body.dataset.page;

  function isSampleItem(item) { return Boolean(site.isSample && item && /^sample-/.test(item.id || "")); }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== "") node.textContent = text;
    return node;
  }
  function link(href, text, className) {
    const node = el("a", className, text); node.href = href; return node;
  }
  function validUrl(value) { return typeof value === "string" && /^https?:\/\//i.test(value) ? value : ""; }
  function validFilename(value) { return typeof value === "string" && /^[A-Za-z0-9._-]+$/.test(value) && value !== ".."; }
  function usablePoster(video) { return video && validFilename(video.poster) && (video.posterPermission !== false || site.internalPreview === true); }
  function siteBaseUrl() { return site && site.siteUrl ? site.siteUrl.replace(/\/+$/, "") + "/" : ""; }
  function reienHref(id) { return "reien-" + encodeURIComponent(id) + ".html"; }
  function feeSummary(item) { const segment = String(item.fee || "").split(/[／（(]/)[0]; const match = segment.match(/^.*?円/); return match ? match[0].trim() : ""; }
  function stationSummary(item) {
    const first = String((Array.isArray(item.access) && item.access[0]) || "");
    const match = first.match(/(.+?駅)\s*(?:から)?\s*徒歩(?:約)?\s*(\d+)\s*分/);
    return match ? match[1] + " 徒歩約" + match[2] + "分" : "";
  }
  function placeSummary(item) { const station = stationSummary(item) || String((Array.isArray(item.access) && item.access[0]) || ""); return [item.city, station].filter(Boolean).join("・") || "—"; }
  function atmosphereSummary(item) { return typeof item.atmosphere === "string" && item.atmosphere.trim() ? item.atmosphere.trim() : ((item.graveTypes || []).some((type) => type.includes("納骨堂")) ? "屋内" : "屋外"); }
  const checklistRows = [["宗派を問わない", "religion"], ["ペットと一緒に入れる", "pet"], ["駐車場", "parking"], ["バリアフリー", "barrierFree"], ["送迎バス", "shuttle"], ["墓じまいの相談", "hakajimai"], ["永代供養", "eitaikuyo"], ["年間管理料がかかる", "annualFee"], ["法要ができる場所", "hoyo"], ["休憩所", "rest"]];
  function checklistValue(item, key) { return item.checklist && item.checklist[key] ? item.checklist[key].v : "確認中"; }
  function checklistLabelValue(item, key) { const value = checklistValue(item, key); return key === "annualFee" && value !== "確認中" ? (value === "あり" ? "かかる" : value === "なし" ? "かからない" : value) : value; }
  function meta(property, content, attribute) {
    const attr = attribute || "property";
    let node = document.head.querySelector('meta[' + attr + '="' + property + '"]');
    if (!node) { node = el("meta"); node.setAttribute(attr, property); document.head.appendChild(node); }
    node.content = content;
  }
  function linkMeta(rel, href) {
    let node = document.head.querySelector('link[rel="' + rel + '"]');
    if (!node) { node = el("link"); node.rel = rel; document.head.appendChild(node); }
    node.href = href;
  }
  function setMetadata(item) {
    const priorityTypes = site.priorityTypes || [];
    const orderedTypes = (item && item.graveTypes || []).map((type, index) => ({ type, index }))
      .sort((a, b) => {
        const aPriority = priorityTypes.indexOf(a.type), bPriority = priorityTypes.indexOf(b.type);
        const aRank = aPriority < 0 ? Infinity : aPriority, bRank = bPriority < 0 ? Infinity : bPriority;
        return aRank - bRank || a.index - b.index;
      }).map(({ type }) => type);
    const title = page === "reien" && item
      ? item.name + "｜" + item.city + "の" + orderedTypes.join("・") + "｜" + site.siteName
      : site.siteName + "｜" + site.tagline;
    document.title = title;
    const description = page === "reien" && item
      ? item.strengthText + "（" + item.name + "・" + item.area + "）" : (site.siteDescription || site.tagline);
    let descriptionMeta = document.querySelector('meta[name="description"]');
    if (!descriptionMeta) { descriptionMeta = el("meta"); descriptionMeta.name = "description"; document.head.appendChild(descriptionMeta); }
    descriptionMeta.content = description;
    meta("og:type", page === "reien" ? "article" : "website");
    meta("og:title", title); meta("og:description", description);
    meta("og:site_name", site.siteName); meta("og:locale", "ja_JP");
    meta("twitter:card", "summary_large_image", "name");
    const imageName = item && item.photos && item.photos.main && item.photos.main.permission !== false && validFilename(item.photos.main.src)
      ? item.photos.main.src : item && usablePoster(item.video) ? item.video.poster : validFilename(site.ogImage) ? site.ogImage : "";
    const baseUrl = siteBaseUrl();
    const imageUrl = imageName ? (baseUrl ? baseUrl + "img/" + imageName : "img/" + imageName) : "";
    if (imageUrl) meta("og:image", imageUrl);
    else { const oldImage = document.head.querySelector('meta[property="og:image"]'); if (oldImage) oldImage.remove(); }
    if (baseUrl) {
      const canonical = page === "reien" && item ? baseUrl + reienHref(item.id) : baseUrl;
      linkMeta("canonical", canonical); meta("og:url", canonical);
    }
    let ld = document.head.querySelector('script[type="application/ld+json"]');
    if (item && !site.isSample) {
      if (!ld) { ld = el("script"); ld.type = "application/ld+json"; document.head.appendChild(ld); }
      const parts = String(item.area || "").match(/^(.+?[都道府県])(.+)$/);
      const data = { "@context": "https://schema.org", "@type": "Cemetery", name: item.name, description: item.strengthText,
        address: { "@type": "PostalAddress", streetAddress: item.address || "" } };
      if (parts) { data.address.addressRegion = parts[1]; data.address.addressLocality = parts[2]; }
      if (item.contact && item.contact.tel && !site.isSample) data.telephone = item.contact.tel;
      if (baseUrl) data.url = baseUrl + reienHref(item.id);
      if (imageUrl) data.image = imageUrl;
      ld.textContent = JSON.stringify(data).replace(/</g, "\\u003c");
    } else if (ld) ld.remove();
    const currentFile = location.pathname.split("/").pop();
    const legacyReienUrl = page === "reien" && currentFile === "reien.html";
    let robots = document.querySelector('meta[name="robots"]');
    if (site.isSample || site.internalPreview || legacyReienUrl) {
      if (!robots) { robots = el("meta"); robots.name = "robots"; document.head.appendChild(robots); }
      robots.content = site.isSample || site.internalPreview ? "noindex, nofollow" : "noindex, follow";
    } else if (robots) robots.remove();
  }
  function sampleBand() {
    if (site.internalPreview) return el("div", "sample-band", "社内確認用です。写真は霊園の許可前のため、外に出さないでください。");
    return site.isSample ? el("div", "sample-band", "サンプル表示　" + site.sampleNotice) : null;
  }
  function header(back) {
    const head = el("header", "site-header wrap");
    const brand = link("index.html", "", "brand");
    brand.setAttribute("aria-label", "はかめぐり トップへ");
    const type = el("span", "brand-type"); type.appendChild(el("span", "brand-latin", "hakamegury")); type.appendChild(el("span", "brand-japanese", "はかめぐり"));
    brand.appendChild(type); head.appendChild(brand);
    const favorites = readFavorites();
    const favLink = link("index.html?view=favorites", favorites.length ? "気になる（" + favorites.length + "）" : "気になる", "header-favorites");
    head.appendChild(favLink); return head;
  }
  function readFavorites() { try { const value = JSON.parse(localStorage.getItem("hakasite.favorites") || "[]"); return Array.isArray(value) ? value.filter((id) => typeof id === "string") : []; } catch (_) { return []; } }
  function footer() {
    const foot = el("footer", "site-footer"), inner = el("div", "wrap footer-inner");
    inner.appendChild(el("p", "footer-brand", site.siteName));
    inner.appendChild(link("guide.html", "はじめてのお墓選び", "footer-link"));
    inner.appendChild(el("p", "muted", "運営：" + site.operator));
    inner.appendChild(el("p", "muted", "連絡先：" + site.operatorContact));
    const privacyUrl = validUrl(site.privacyUrl);
    if (privacyUrl) inner.appendChild(link(privacyUrl, "個人情報の扱い", "footer-link"));
    else inner.appendChild(el("p", "muted", "個人情報の扱い：準備中"));
    inner.appendChild(el("p", "muted", "© " + new Date().getFullYear())); foot.appendChild(inner); return foot;
  }
  function photo(item, cls, sampleItem, showEmpty) {
    const validPhoto = item && validFilename(item.src) && (item.permission !== false || site.internalPreview === true);
    if (!validPhoto && !sampleItem && !showEmpty) return null;
    const frame = el("div", "photo-frame " + (cls || ""));
    if (validPhoto) { const image = el("img"); image.src = "img/" + item.src; image.alt = item.alt || item.slot || "霊園の写真"; image.decoding = "async"; if (/\bcard-photo\b/.test(cls || "")) { image.loading = "lazy"; image.srcset = "img/" + item.src + ".w800.webp 800w, img/" + item.src + " 1280w"; image.sizes = "(min-width: 1024px) 380px, (min-width: 700px) 46vw, 92vw"; } frame.appendChild(image); if (item.permission === false) frame.appendChild(el("span", "photo-permission", "許可前")); }
    else { frame.classList.add("photo-placeholder"); frame.appendChild(el("span", "photo-slot", item && item.slot ? item.slot : "写真")); frame.appendChild(el("span", "photo-sample", "サンプル")); }
    if (!validPhoto && !sampleItem && showEmpty) { frame.classList.add("photo-missing"); frame.replaceChildren(el("span", "photo-missing-label", "写真は準備中です")); }
    return frame;
  }
  function makeCard(item, options) {
    const settings = options || {};
    const card = el("article", "reien-card"), cardLink = link(reienHref(item.id), "", "card-link"); card.dataset.reienId=item.id;
    let source = item.photos && item.photos.main;
    if ((!source || !source.src) && usablePoster(item.video)) source = { src: item.video.poster, alt: item.name + "の写真" };
    const sampleItem = isSampleItem(item), cardPhoto = photo(source, "card-photo", sampleItem, true);
    cardLink.appendChild(cardPhoto);
    if ((item.video && validFilename(item.video.src)) || sampleItem) cardPhoto.appendChild(el("span", "video-mark", "動画あり"));
    const body = el("div", "card-body");
    body.appendChild(el("p", "area-mark", item.area));
    if (settings.reason) body.appendChild(el("p", "related-reason", settings.reason));
    body.appendChild(el("h3", "card-title", item.name)); body.appendChild(el("p", "card-copy", item.strengthText));
    body.appendChild(el("p", "card-facts", feeSummary(item) ? "費用：" + feeSummary(item) + "〜" : "費用：要問い合わせ"));
    const cardStation = stationSummary(item); if (cardStation) body.appendChild(el("p", "card-facts", cardStation));
    body.appendChild(tagList(item.graveTypes, "tag-list"));
    cardLink.appendChild(body); card.appendChild(cardLink);
    const actions = el("div", "card-actions"); actions.appendChild(link(reienHref(item.id), "くわしく見る", "card-more"));
    if (settings.showContact && !sampleItem) actions.appendChild(link(reienHref(item.id) + "#contact", "問い合わせ先", "card-contact"));
    card.appendChild(actions);
    if (settings.onFavorite) {
      const favorite = el("button", "favorite-button", settings.isFavorite ? "気になるに入れました" : "気になる");
      favorite.type = "button"; favorite.dataset.key = "fav:" + item.id; favorite.setAttribute("aria-pressed", settings.isFavorite ? "true" : "false");
      favorite.addEventListener("click", settings.onFavorite); card.appendChild(favorite);
    }
    return card;
  }
  function tagList(items, cls) {
    const ul = el("ul", cls || "tag-list"); (items || []).filter(Boolean).forEach((x) => ul.appendChild(el("li", "tag" + ((site.priorityTypes || []).includes(x) ? " tag-priority" : ""), x))); return ul;
  }
  function galleryItemsNotEmpty(items) { return Array.isArray(items) && items.length > 0; }
  function publisherSection() {
    const section = el("details", "publisher wrap");
    section.appendChild(el("summary", "publisher-summary", "霊園の方へ：掲載について"));
    const content = el("div", "publisher-content");
    content.appendChild(el("p", "", "掲載のご相談は、LINEの窓口で受け付けています。"));
    const lineUrl = validUrl(site.lineUrl);
    if (lineUrl) content.appendChild(link(lineUrl, "LINEの窓口を見る", "button button-outline"));
    else content.appendChild(el("p", "muted", "窓口は準備中です"));
    content.appendChild(el("h3", "steps-title", "掲載までの流れ"));
    const ol = el("ol", "listing-steps"); (site.listingSteps || []).forEach((s) => ol.appendChild(el("li", "", s))); content.appendChild(ol);
    section.appendChild(content);
    return section;
  }
  function makeIndex() {
    const band = sampleBand(); if (band) app.appendChild(band); app.appendChild(header(false));
    const intro = el("section", "intro wrap"); intro.appendChild(el("p", "eyebrow", site.tagline));
    const h1 = el("h1", "display-title"); h1.appendChild(el("span", "title-phrase", "お墓の、")); h1.appendChild(el("span", "title-phrase", "新しい選び方。")); intro.appendChild(h1);
    intro.appendChild(el("p", "intro-copy", "跡継ぎを前提にしないお墓のある霊園を中心に、写真と動画で紹介しています。気になる霊園があれば、霊園へ直接お問い合わせください。")); app.appendChild(intro);
    const priority = site.priorityTypes || [];
    const ordered = entries.filter((item) => (item.graveTypes || []).some((type) => priority.includes(type)))
      .concat(entries.filter((item) => !(item.graveTypes || []).some((type) => priority.includes(type))));
    const listing = el("section", "listing wrap"); listing.appendChild(link("guide.html", "はじめての方へ：お墓選びの基本", "guide-entry")); const row = el("div", "section-heading"); row.appendChild(el("h2", "section-title", "掲載している霊園"));
    const count = el("p", "muted", ""); count.setAttribute("aria-live", "polite"); row.appendChild(count); listing.appendChild(row);
    const viewSwitch = el("div", "view-switch"); viewSwitch.setAttribute("role", "group"); viewSwitch.setAttribute("aria-label", "表示方法");
    const listViewButton = el("button", "filter-button", "一覧で見る"), mapViewButton = el("button", "filter-button", "地図で見る");
    listViewButton.type = mapViewButton.type = "button"; listViewButton.dataset.view = "list"; mapViewButton.dataset.view = "map";
    const favoritesViewButton = el("button", "filter-button", "気になる");
    listViewButton.type = mapViewButton.type = favoritesViewButton.type = "button"; favoritesViewButton.dataset.view = "favorites";
    viewSwitch.append(listViewButton, mapViewButton, favoritesViewButton); listing.appendChild(viewSwitch);
    const filters = [{ label: "すべて", match: null }].concat((site.typeFilters || []).filter((filter) => ordered.some((item) => (item.graveTypes || []).some((type) => filter.match.includes(type)))));
    const checklistFilterKeys = { "宗旨宗派を問わない": "religion", "駐車場あり": "parking", "バリアフリー": "barrierFree", "墓じまいの相談ができる": "hakajimai" };
    const featureFilters = (site.featureFilters || []).filter((filter) => ordered.some((item) => {
      const key = checklistFilterKeys[filter.label];
      if (key && item.checklist) return checklistValue(item, key) === "あり";
      const haystack = featureText(item);
      return filter.match.some((part) => haystack.includes(part));
    }));
    const controls = el("div", "search-controls");
    const queryLabel = el("label", "filter-label", "霊園名・地名・駅名で探す"); queryLabel.htmlFor = "reien-search"; controls.appendChild(queryLabel);
    const queryInput = el("input", "search-input"); queryInput.type = "search"; queryInput.id = "reien-search"; queryInput.placeholder = "例：〇〇駅、〇〇市"; queryInput.autocomplete = "off"; controls.appendChild(queryInput);
    const sortLabel = el("label", "filter-label", "並べ替え"); sortLabel.htmlFor = "reien-sort"; controls.appendChild(sortLabel);
    const sortSelect = el("select", "area-select"); sortSelect.id = "reien-sort";
    [["listed", "掲載順"], ["station", "駅から近い順"]].forEach(([value, label]) => { const option = el("option", "", label); option.value = value; sortSelect.appendChild(option); }); controls.appendChild(sortSelect);
    const more = el("details", "search-more"); const wideSearch = window.matchMedia("(min-width: 700px)"); more.open = wideSearch.matches; wideSearch.addEventListener("change", (event) => { more.open = event.matches; }); const summary = el("summary", "search-summary", "条件でしぼる"); more.appendChild(summary);
    const moreContents = el("div", "search-more-content");
    const areaLabel = el("label", "filter-label", "エリア"); areaLabel.htmlFor = "area-filter"; moreContents.appendChild(areaLabel);
    const areaSelect = el("select", "area-select"); areaSelect.id = "area-filter";
    const areaOption = el("option", "", "すべてのエリア"); areaOption.value = ""; areaSelect.appendChild(areaOption);
    Array.from(new Set(ordered.map((item) => item.area).filter(Boolean))).forEach((area) => { const option = el("option", "", area); option.value = area; areaSelect.appendChild(option); }); moreContents.appendChild(areaSelect);
    const typeGroup = el("div", "filter-group"); typeGroup.appendChild(el("p", "filter-label", "お墓の種類"));
    const filterBar = el("div", "type-filters"); filterBar.setAttribute("role", "group"); filterBar.setAttribute("aria-label", "お墓の種類でしぼる"); typeGroup.appendChild(filterBar); moreContents.appendChild(typeGroup);
    const featureGroup = el("div", "filter-group"); featureGroup.appendChild(el("p", "filter-label", "こだわり条件"));
    const featureBar = el("div", "type-filters"); featureBar.setAttribute("role", "group"); featureBar.setAttribute("aria-label", "こだわり条件"); featureGroup.appendChild(featureBar); moreContents.appendChild(featureGroup); more.appendChild(moreContents); controls.appendChild(more);
    const cards = el("div", "cards"), activeChips = el("div", "active-filters"), empty = el("div", "empty-results");
    const mapArea = el("div", "listing-map-wrap"); mapArea.hidden = true;
    const mapElement = el("div", "listing-map"); mapElement.setAttribute("role", "region"); mapElement.setAttribute("aria-label", "霊園の地図");
    const mapNote = el("p", "map-note muted", "位置は住所から出した目安です。一部は丁目までの大まかな位置です。");
    const mapCard = el("div", "map-card-slot"); mapCard.hidden = true;
    mapArea.append(mapElement, mapCard, mapNote);
    const favoriteToggle = el("button", "filter-button favorite-toggle", "気になるだけ見る"); favoriteToggle.type = "button"; favoriteToggle.hidden = true; controls.appendChild(favoriteToggle);
    const compareButton = el("button", "button button-outline compare-open", "気になる霊園を見比べる"); compareButton.type = "button"; compareButton.hidden = true; const compareArea = el("div", "compare-area");
    const requestedView = new URLSearchParams(location.search).get("view");
    let state = { q: "", area: "", type: "", features: [], favoritesOnly: false, sort: "listed", view: requestedView === "favorites" ? "favorites" : requestedView === "map" || (!requestedView && window.matchMedia("(min-width: 1024px)").matches) ? "map" : "list" };
    let favorites = []; try { const saved = JSON.parse(localStorage.getItem("hakasite.favorites") || "[]"); if (Array.isArray(saved)) favorites = saved.filter((id) => typeof id === "string" && entries.some((item) => item.id === id)); } catch (_) { favorites = []; }
    const selectedMap = el("section", "selected-map-item"); selectedMap.hidden = true;
    let selectedMapId = "";
    const favoritesNote=el("p","muted favorites-note","気になるは、このブラウザに保存されます。別のスマホやパソコンには引き継がれません。"); favoritesNote.hidden=true;
    function persistFavorites() { try { localStorage.setItem("hakasite.favorites", JSON.stringify(favorites)); } catch (_) {} }
    function normalize(value) { return String(value || "").normalize("NFKC").replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60)).toLowerCase(); }
    function featureText(item) {
      const fields = [
        "強み:" + (item.strengthType || ""),
        "強みの文:" + (item.strengthText || ""),
        ...(item.otherStrengths || []).map((value) => "特長:" + value),
        ...(item.forWhom || []).map((value) => "こんな方に:" + value),
        "宗旨:" + (item.religion || ""),
        ...(item.facilities || []).map((value) => "設備:" + value),
        ...(item.access || []).map((value) => "行き方:" + value),
        "駐車場:" + (/^あり(?:$|[（( ・])/.test(item.parking || "") ? "あり" : (item.parking || "")),
        "運営:" + (item.operationType || ""),
        "墓じまい相談:" + (item.hakajimaiConsult || "")
      ];
      if ((item.video && validFilename(item.video.src)) || isSampleItem(item)) fields.push("動画:あり");
      return fields.filter((value) => value && !value.endsWith(":" )).join("\n");
    }
    function searchText(item) { return [item.name, item.kana, item.area, item.city, item.address, item.access, item.strengthText].flat(Infinity).filter(Boolean).join(" "); }
    function walkMinutes(item) { const match = (Array.isArray(item.access) ? item.access : []).join(" ").match(/徒歩(?:約)?\s*(\d+)\s*分/); return match ? Number(match[1]) : null; }
    function currentItems() { const filtered = ordered.filter((item) => {
      if (state.q && !normalize(searchText(item)).includes(normalize(state.q))) return false;
      if (state.area && item.area !== state.area) return false;
      if (state.type && !(item.graveTypes || []).some((type) => (site.typeFilters.find((f) => f.label === state.type) || {match:[]}).match.includes(type))) return false;
      const haystack = featureText(item); if (!state.features.every((label) => { const f = featureFilters.find((x) => x.label === label); const key = checklistFilterKeys[label]; if (key && item.checklist) return checklistValue(item, key) === "あり"; return f && f.match.some((part) => haystack.includes(part)); })) return false;
      if ((state.favoritesOnly || state.view === "favorites") && !favorites.includes(item.id)) return false;
      return true;
    }); return state.sort === "station" ? filtered.slice().sort((a,b) => { const am=walkMinutes(a), bm=walkMinutes(b); return (am === null ? Infinity : am) - (bm === null ? Infinity : bm) || ordered.indexOf(a) - ordered.indexOf(b); }) : filtered; }
    function syncUrl() { const params = new URLSearchParams(); if (state.q) params.set("q", state.q); if (state.area) params.set("area", state.area); if (state.type) params.set("type", state.type); if (state.features.length) params.set("f", state.features.join(",")); if (state.sort !== "listed") params.set("sort", state.sort); if (state.view === "map" || state.view === "favorites") params.set("view", state.view); const preview = new URLSearchParams(location.search).get("preview"); if(preview)params.set("preview",preview); const query = params.toString(); try { history.replaceState(null, "", location.pathname + (query ? "?" + query : "") + location.hash); } catch (_) {} }
    function clearAll() { state = {q:"",area:"",type:"",features:[],favoritesOnly:false,sort:"listed"}; queryInput.value = ""; areaSelect.value = ""; sortSelect.value = "listed"; favoriteToggle.setAttribute("aria-pressed", "false"); render(); }
    function render() {
      const active = document.activeElement;
      const focusKey = active && active.tagName === "BUTTON" ? active.dataset.key : "";
      const shown = currentItems(); cards.replaceChildren(); count.textContent = ordered.length + "件中 " + shown.length + "件"; count.setAttribute("aria-live", "polite");
      selectedMap.replaceChildren(); selectedMap.hidden = !selectedMapId || state.view !== "map" || window.matchMedia("(max-width: 699px)").matches || (inlinePreview && inlinePreviewId === selectedMapId);
      const selectedItem = ordered.find((item) => item.id === selectedMapId);
      if (selectedItem && !selectedMap.hidden) {
        const top = el("div", "selected-map-heading"); top.appendChild(el("span", "", "地図で選んだ霊園"));
        const closeSelected = el("button", "selected-map-close", "×"); closeSelected.type = "button"; closeSelected.setAttribute("aria-label", "選んだ霊園を閉じる"); closeSelected.addEventListener("click", () => { selectedMapId = ""; if (mapInstance && mapInstance.getSource("reien")) mapInstance.removeFeatureState({ source: "reien", id: selectedItem.id }, "active"); render(); }); top.appendChild(closeSelected);
        const selectedCard = makeCard(selectedItem, { showContact: true, isFavorite: favorites.includes(selectedItem.id), onFavorite: () => toggleFavorite(selectedItem.id) }); selectedCard.classList.add("selected-map-card");
        selectedMap.append(top, selectedCard);
      }
      cards.hidden = !!inlinePreview; mapArea.hidden = state.view !== "map";
      controls.classList.toggle("is-map", state.view === "map");
      [listViewButton, mapViewButton, favoritesViewButton].forEach((button) => button.setAttribute("aria-pressed", state.view === button.dataset.view ? "true" : "false"));
      filterBar.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.label === state.type ? "true" : "false"));
      featureBar.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", state.features.includes(b.dataset.label) ? "true" : "false"));
      const activeCount = (state.q ? 1 : 0) + (state.area ? 1 : 0) + (state.type ? 1 : 0) + state.features.length + (state.favoritesOnly ? 1 : 0); summary.textContent = activeCount ? "条件でしぼる（" + activeCount + "）" : "条件でしぼる";
      activeChips.replaceChildren(); function chip(label, key, action) { const b = el("button", "chip-button", label + " ×"); b.type = "button"; b.dataset.key = key; b.addEventListener("click", action); activeChips.appendChild(b); }
      if (state.type) chip(state.type, "chip:type:" + state.type, () => {state.type="";render();}); if (state.area) chip(state.area, "chip:area:" + state.area, () => {state.area="";areaSelect.value="";render();}); if (state.q) chip("ことば：" + state.q, "chip:q", () => {state.q="";queryInput.value="";render();});
      state.features.slice().forEach((label) => chip(label, "chip:feature:" + label, () => {state.features=state.features.filter((x)=>x!==label);render();})); if (state.favoritesOnly) chip("気になる", "chip:favonly", () => {state.favoritesOnly=false;favoriteToggle.setAttribute("aria-pressed","false");render();});
      if (activeCount) { const clear = el("button", "chip-button", "条件をすべて外す"); clear.type="button"; clear.dataset.key="chip:clear"; clear.addEventListener("click",clearAll); activeChips.appendChild(clear); }
      activeChips.hidden = !activeCount; empty.replaceChildren(); empty.hidden = shown.length > 0;
      if (!shown.length) { empty.appendChild(el("p", "", state.view === "favorites" ? "気になる霊園はまだありません。霊園のカードやくわしい画面の『気になる』を押すと、ここに集まります。" : "この条件に合う霊園はありません。")); if(state.view !== "favorites"){const clear = el("button", "filter-button", "条件をすべて外す"); clear.type="button"; clear.dataset.key="empty:clear"; clear.addEventListener("click",clearAll); empty.appendChild(clear);} }
      shown.forEach((item) => cards.appendChild(makeCard(item, {
        showContact: true,
        isFavorite: favorites.includes(item.id),
        onFavorite: () => toggleFavorite(item.id)
      })));
      if(selectedMapId && state.view === "map")cards.querySelectorAll('[data-reien-id="'+CSS.escape(selectedMapId)+'"]').forEach((card)=>card.classList.add("map-selected-in-list"));
      if (state.view === "map" && mapInstance && mapInstance.getSource("reien")) cards.querySelectorAll(".reien-card").forEach((card, index) => {
        const item = shown[index]; if (!item || !item.geo) return;
        card.addEventListener("mouseenter", () => mapInstance.setFeatureState({ source: "reien", id: item.id }, { active: true }));
        card.addEventListener("mouseleave", () => mapInstance.removeFeatureState({ source: "reien", id: item.id }, "active"));
      });
      cards.dataset.mapView = state.view === "map" ? "true" : "false";
      if (state.view === "map") renderMap(shown);
      const favCount = favorites.length; favoriteToggle.hidden = !favCount; favoriteToggle.textContent = "気になるだけ見る（" + favCount + "）"; favoriteToggle.setAttribute("aria-pressed", state.favoritesOnly ? "true" : "false"); compareButton.hidden = favCount < 2;
      favoritesViewButton.textContent = favCount ? "気になる（" + favCount + "）" : "気になる";
      favoritesNote.hidden=state.view!=="favorites";
      const headerFavorite = document.querySelector(".header-favorites"); if(headerFavorite) headerFavorite.textContent = favCount ? "気になる（" + favCount + "）" : "気になる";
      if(state.view === "favorites" && favCount) drawComparison(); else if(state.view !== "favorites") compareArea.replaceChildren();
      syncUrl();
      if (focusKey) {
        const target = Array.from(app.querySelectorAll("button[data-key]")).find((button) => button.dataset.key === focusKey);
        if (target && target.offsetParent !== null) target.focus({ preventScroll: true });
        else queryInput.focus({ preventScroll: true });
      }
    }
    let mapLibrePromise = null, mapInstance = null, initialMapFit = false, mapItems = [];
    function loadStyle(href) { if (document.querySelector('link[href="' + href + '"]')) return; const node = el("link"); node.rel = "stylesheet"; node.href = href; document.head.appendChild(node); }
    function loadScript(src) { return new Promise((resolve, reject) => { const existing = document.querySelector('script[src="' + src + '"]'); if (existing) { if (existing.dataset.loaded === "true") resolve(); else { existing.addEventListener("load", resolve, { once: true }); existing.addEventListener("error", reject, { once: true }); } return; } const script = el("script"); script.src = src; script.async = true; script.onload = () => { script.dataset.loaded = "true"; resolve(); }; script.onerror = reject; document.head.appendChild(script); }); }
    function ensureMapLibre() {
      if (!mapLibrePromise) {
        loadStyle("https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css");
        mapLibrePromise = loadScript("https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js");
      }
      return mapLibrePromise;
    }
    function mapLabel(item) {
      const name = String(item.name || "").split("（")[0].split("(")[0].trim();
      return name.length > 10 ? name.slice(0, 10) + "…" : name;
    }
    function mapFeature(item, index) {
      const badge = "reien-badge-" + index;
      return { type: "Feature", geometry: { type: "Point", coordinates: [item.geo.lng, item.geo.lat] }, properties: { id: item.id, label: mapLabel(item), badgeNormal: badge + "-normal", badgeActive: badge + "-active" } };
    }
    function addMapBadge(map, item, index, active) {
      const label = mapLabel(item), ratio = 2, height = 38, ctxMeasure = document.createElement("canvas").getContext("2d");
      ctxMeasure.font = "700 15px sans-serif";
      const width = Math.max(48, Math.min(180, Math.ceil(ctxMeasure.measureText(label).width + 24)));
      const canvas = document.createElement("canvas"); canvas.width = width * ratio; canvas.height = height * ratio;
      const ctx = canvas.getContext("2d"); ctx.scale(ratio, ratio); ctx.font = "700 15px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(width - 16, 0); ctx.quadraticCurveTo(width, 0, width, 16); ctx.lineTo(width, 16); ctx.quadraticCurveTo(width, 32, width - 16, 32); ctx.lineTo(width / 2 + 5, 32); ctx.lineTo(width / 2, 38); ctx.lineTo(width / 2 - 5, 32); ctx.lineTo(16, 32); ctx.quadraticCurveTo(0, 32, 0, 16); ctx.lineTo(0, 16); ctx.quadraticCurveTo(0, 0, 16, 0); ctx.closePath();
      ctx.fillStyle = active ? "#2F5A4C" : "#FFFFFF"; ctx.fill(); if (!active) { ctx.strokeStyle = "#D8D2C4"; ctx.lineWidth = 1; ctx.stroke(); }
      ctx.fillStyle = active ? "#FFFFFF" : "#2A2926"; ctx.fillText(label, width / 2, 16);
      const name = "reien-badge-" + index + (active ? "-active" : "-normal");
      if (!map.hasImage(name)) map.addImage(name, ctx.getImageData(0, 0, canvas.width, canvas.height), { pixelRatio: ratio });
    }
    function showMapCard(id) {
      const item = mapItems.find((entry) => entry.id === id); if (!item) return;
      selectedMapId = id; render(); if(leftResults)leftResults.scrollTop=0;
      if (window.matchMedia("(min-width: 700px)").matches) { mapCard.hidden = true; return; }
      mapCard.replaceChildren(); mapCard.hidden = false;
      const close = el("button", "map-card-close", "×"); close.type = "button"; close.setAttribute("aria-label", "カードを閉じる"); close.addEventListener("click", () => { mapCard.hidden = true; });
      const card = el("article", "map-popup-card"), src = item.photos && item.photos.main && validFilename(item.photos.main.src) && item.photos.main.permission !== false ? item.photos.main.src : "";
      if (src) { const img = el("img", "map-popup-photo"); img.src = "img/" + src + ".w800.webp"; img.decoding = "async"; img.alt = item.photos.main.alt || item.name; card.appendChild(img); }
      card.appendChild(el("p", "area-mark", item.area || "")); card.appendChild(el("h3", "map-popup-title", item.name));
      card.appendChild(el("p", "map-popup-copy", item.strengthText || "")); if ((item.graveTypes || []).length) card.appendChild(tagList(item.graveTypes));
      card.appendChild(link(reienHref(item.id), "くわしく見る", "map-popup-link")); mapCard.append(close, card);
    }
    function applyMapStyle(map) {
      const style = map.getStyle();
      style.layers.forEach((layer) => {
        const id = layer.id.toLowerCase(), sourceLayer = String(layer["source-layer"] || "").toLowerCase();
        const isBuilding = /building/.test(id) || sourceLayer === "building";
        const isRoad = /transportation|road|highway/.test(id) || sourceLayer === "transportation";
        const isLabel = layer.type === "symbol" && /place|settlement|locality|label/.test(id);
        if (layer.type === "symbol" && layer.layout && layer.layout["text-field"] !== undefined) map.setLayoutProperty(layer.id, "text-field", ["coalesce", ["get", "name:ja"], ["get", "name"]]);
        if (isBuilding) { map.setLayoutProperty(layer.id, "visibility", "none"); return; }
        if (layer.type === "symbol" && !isLabel) { map.setLayoutProperty(layer.id, "visibility", "none"); return; }
        if (isLabel) {
          const localityFilter = ["in", ["get", "class"], ["literal", ["city", "town", "village", "hamlet", "municipality", "suburb", "borough"]]];
          map.setFilter(layer.id, localityFilter);
          map.setLayoutProperty(layer.id, "text-size", 12);
          map.setPaintProperty(layer.id, "text-color", "#6B675E"); map.setPaintProperty(layer.id, "text-halo-color", "#FFFFFF"); map.setPaintProperty(layer.id, "text-halo-width", 1.5);
          return;
        }
        if (layer.type === "line" && isRoad) {
          const importantWay = ["any", ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary"]]], ["==", ["get", "class"], "rail"]];
          map.setFilter(layer.id, importantWay);
        }
      });
    }
    function renderMap(items) {
      mapCard.hidden = window.matchMedia("(min-width: 700px)").matches;
      ensureMapLibre().then(() => {
        if (state.view !== "map") return;
        mapItems = items.filter((item) => !/^sample-/.test(item.id || "") && item.geo && Number.isFinite(item.geo.lat) && Number.isFinite(item.geo.lng));
        const data = { type: "FeatureCollection", features: mapItems.map(mapFeature) };
        const bounds = mapItems.reduce((b, item) => b.extend([item.geo.lng, item.geo.lat]), new window.maplibregl.LngLatBounds());
        if (!mapInstance) {
          mapInstance = new window.maplibregl.Map({ container: mapElement, style: "https://tiles.openfreemap.org/styles/positron", center: [139.5, 35.68], zoom: 8, attributionControl: false, cooperativeGestures: true });
          mapInstance.addControl(new window.maplibregl.AttributionControl({ customAttribution: "© OpenFreeMap © OpenMapTiles © OpenStreetMap contributors", compact: true }), "bottom-right");
          mapInstance.on("load", () => {
            applyMapStyle(mapInstance); const attrib = mapElement.querySelector(".maplibregl-ctrl-attrib"); if (attrib) attrib.classList.remove("maplibregl-compact-show"); // 出典は「i」に畳んでおく（スマホで地図の下を隠さない）
            mapItems.forEach((item, index) => { addMapBadge(mapInstance, item, index, false); addMapBadge(mapInstance, item, index, true); });
            mapInstance.addSource("reien", { type: "geojson", data: { type: "FeatureCollection", features: mapItems.map(mapFeature) }, cluster: true, clusterRadius: 50, clusterMaxZoom: 14, promoteId: "id" });
            mapInstance.addLayer({ id: "reien-clusters", type: "circle", source: "reien", filter: ["has", "point_count"], paint: { "circle-color": "#2F5A4C", "circle-radius": ["step", ["get", "point_count"], 20, 10, 23, 100, 27], "circle-stroke-color": "#FFFFFF", "circle-stroke-width": 2 } });
            mapInstance.addLayer({ id: "reien-cluster-count", type: "symbol", source: "reien", filter: ["has", "point_count"], layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Bold"], "text-size": 13, "text-allow-overlap": true }, paint: { "text-color": "#FFFFFF" } });
            mapInstance.addLayer({ id: "reien-pins", type: "symbol", source: "reien", filter: ["!", ["has", "point_count"]], layout: { "icon-image": ["get", "badgeNormal"], "icon-anchor": "bottom", "icon-allow-overlap": true, "icon-ignore-placement": true }, paint: { "icon-opacity": ["case", ["boolean", ["feature-state", "active"], false], 0, 1] } });
            mapInstance.addLayer({ id: "reien-pins-active", type: "symbol", source: "reien", filter: ["!", ["has", "point_count"]], layout: { "icon-image": ["get", "badgeActive"], "icon-anchor": "bottom", "icon-allow-overlap": true, "icon-ignore-placement": true }, paint: { "icon-opacity": ["case", ["boolean", ["feature-state", "active"], false], 1, 0] } }); if(selectedMapId && mapItems.some((item)=>item.id===selectedMapId))mapInstance.setFeatureState({source:"reien",id:selectedMapId},{active:true});
            mapInstance.on("click", "reien-clusters", (event) => { const feature = mapInstance.queryRenderedFeatures(event.point, { layers: ["reien-clusters"] })[0]; Promise.resolve(mapInstance.getSource("reien").getClusterExpansionZoom(feature.properties.cluster_id)).then((zoom) => mapInstance.easeTo({ center: feature.geometry.coordinates, zoom: Math.min((zoom || mapInstance.getZoom() + 2) + 0.5, 16) })).catch(() => mapInstance.easeTo({ center: feature.geometry.coordinates, zoom: mapInstance.getZoom() + 2 })); }); mapInstance.on("mouseenter", "reien-clusters", () => { mapElement.style.cursor = "pointer"; }); mapInstance.on("mouseleave", "reien-clusters", () => { mapElement.style.cursor = ""; });
            mapInstance.on("click", "reien-pins", (event) => { const feature = event.features && event.features[0]; if (feature) { selectedMapId = feature.properties.id; if(inlinePreview){openDrawer(feature.properties.id,null,true);return;} mapItems.forEach((item) => { if(item.id === selectedMapId) mapInstance.setFeatureState({ source:"reien", id:item.id }, {active:true}); else mapInstance.removeFeatureState({source:"reien",id:item.id},"active"); }); showMapCard(feature.properties.id); } });
            mapInstance.on("mouseenter", "reien-pins", () => { mapElement.style.cursor = "pointer"; }); mapInstance.on("mouseleave", "reien-pins", () => { mapElement.style.cursor = ""; });
            cards.querySelectorAll(".reien-card").forEach((card, index) => { const item = currentItems()[index]; if (!item || !item.geo || !mapItems.some((entry) => entry.id === item.id)) return; card.addEventListener("mouseenter", () => mapInstance.setFeatureState({ source: "reien", id: item.id }, { active: true })); card.addEventListener("mouseleave", () => mapInstance.removeFeatureState({ source: "reien", id: item.id }, "active")); });
            if (!initialMapFit && bounds.isEmpty() === false) { mapInstance.fitBounds(bounds, { padding: 40, maxZoom: 12 }); initialMapFit = true; }
          });
        } else if (mapInstance.isStyleLoaded() && mapInstance.getSource("reien")) {
          mapItems.forEach((item, index) => { addMapBadge(mapInstance, item, index, false); addMapBadge(mapInstance, item, index, true); });
          mapInstance.getSource("reien").setData(data);
        }
        if (!initialMapFit && !bounds.isEmpty() && mapInstance.loaded()) { mapInstance.fitBounds(bounds, { padding: 40, maxZoom: 12 }); initialMapFit = true; }
        window.setTimeout(() => mapInstance.resize(), 0);
      }).catch(() => { state.view = "list"; cards.hidden = false; mapArea.hidden = true; listViewButton.setAttribute("aria-pressed", "true"); mapViewButton.setAttribute("aria-pressed", "false"); syncUrl(); });
    }
    ["pointerenter", "focus", "touchstart"].forEach((type) => mapViewButton.addEventListener(type, () => { ensureMapLibre().catch(() => {}); }, { once: true, passive: true }));
    if (window.matchMedia("(min-width: 1024px)").matches) (window.requestIdleCallback || ((fn) => window.setTimeout(fn, 2500)))(() => { ensureMapLibre().catch(() => {}); });
    function scrollToViewSwitch() { const top = viewSwitch.getBoundingClientRect().top; if (top > 120 || top < 0) window.scrollTo({ top: Math.max(0, window.scrollY + top - 12), behavior: "smooth" }); }
    listViewButton.addEventListener("click", () => { const id=inlinePreview&&previewItem?previewItem.id:""; if(inlinePreview){inlinePreview=false;drawer.classList.remove("preview-inline");cards.hidden=false;} state.view = "list"; render(); if(id)openDrawer(id,null,false); }); mapViewButton.addEventListener("click", () => { state.area = ""; areaSelect.value = ""; state.sort = "listed"; sortSelect.value = "listed"; state.view = "map"; render(); window.requestAnimationFrame(scrollToViewSwitch); }); favoritesViewButton.addEventListener("click", () => { const id=inlinePreview&&previewItem?previewItem.id:""; if(inlinePreview){inlinePreview=false;drawer.classList.remove("preview-inline");cards.hidden=false;} state.view = "favorites"; render(); if(id)openDrawer(id,null,false); });
    function toggleFavorite(id) { favorites = favorites.includes(id) ? favorites.filter((x) => x !== id) : favorites.concat(id); persistFavorites(); render(); }
    filters.forEach((filter) => { const button = el("button", "filter-button", filter.label); button.type="button"; button.dataset.label=filter.label; button.dataset.key="type:" + filter.label; button.setAttribute("aria-pressed", "false"); button.addEventListener("click", () => {state.type = filter.match ? (state.type === filter.label ? "" : filter.label) : "";render();}); filterBar.appendChild(button); });
    featureFilters.forEach((filter) => {const button=el("button","filter-button",filter.label);button.type="button";button.dataset.label=filter.label;button.dataset.key="feature:" + filter.label;button.setAttribute("aria-pressed","false");button.addEventListener("click",()=>{state.features=state.features.includes(filter.label)?state.features.filter((x)=>x!==filter.label):state.features.concat(filter.label);render();});featureBar.appendChild(button);});
    queryInput.addEventListener("input", () => {state.q=queryInput.value;render();}); areaSelect.addEventListener("change",()=>{state.area=areaSelect.value;render();}); sortSelect.addEventListener("change",()=>{state.sort=sortSelect.value==="station"?"station":"listed";render();});
    favoriteToggle.dataset.key="favorites:toggle"; favoriteToggle.addEventListener("click",()=>{state.favoritesOnly=!state.favoritesOnly;render();});
    compareButton.addEventListener("click",()=>drawComparison()); controls.appendChild(count); controls.appendChild(activeChips); controls.appendChild(compareButton); controls.appendChild(empty); listing.appendChild(controls);
    function drawComparison() {
      compareArea.replaceChildren(); const close=el("button","filter-button","比べる表を閉じる");close.type="button";close.addEventListener("click",()=>{compareArea.replaceChildren();compareButton.focus({preventScroll:true});});compareArea.appendChild(close);
      const selected=ordered.filter((item)=>favorites.includes(item.id));const wrap=el("div","compare-wrap");const table=el("table","compare-table"),thead=el("thead"),head=el("tr");head.appendChild(el("th","","項目"));selected.forEach((item)=>{const th=el("th");th.appendChild(link(reienHref(item.id),item.name,"text-link"));head.appendChild(th);});thead.appendChild(head);table.appendChild(thead);
      const rows=[["費用",(i)=>feeSummary(i)||"霊園へお問い合わせください"],["場所",(i)=>placeSummary(i)],["雰囲気",(i)=>atmosphereSummary(i)],["エリア",(i)=>i.area],["お墓の種類",(i)=>(i.graveTypes||[]).join("・")],["費用の詳細",(i)=>i.fee||"霊園へお問い合わせください"],["アクセス",(i)=>(i.access||[]).join("・")],["駐車場",(i)=>i.parking],["宗旨・宗派",(i)=>i.religion],["墓じまいの相談",(i)=>i.hakajimaiConsult],["動画",(i)=>((i.video&&validFilename(i.video.src))||isSampleItem(i))?"あり":"なし"]];
      checklistRows.forEach(([label,key])=>rows.push([label,(i)=>checklistValue(i,key)]));
      const tbody=el("tbody");rows.forEach(([label,get])=>{const tr=el("tr");tr.appendChild(el("th","",label));selected.forEach((item)=>tr.appendChild(el("td","",get(item)||"")));tbody.appendChild(tr);});table.appendChild(tbody);wrap.appendChild(table);compareArea.appendChild(wrap);
    }
    try { const params = new URLSearchParams(location.search); const q=params.get("q")||"", area=params.get("area")||"", type=params.get("type")||"", sort=params.get("sort")||"listed"; if(q) state.q=q; if(Array.from(areaSelect.options).some((o)=>o.value===area)) state.area=area; if(filters.some((f)=>f.label===type&&f.match)) state.type=type; state.features=(params.get("f")||"").split(",").filter((label,i,all)=>featureFilters.some((f)=>f.label===label)&&all.indexOf(label)===i); if(sort==="station")state.sort=sort; queryInput.value=state.q;areaSelect.value=state.area;sortSelect.value=state.sort; } catch (_) {}
    const leftResults=el("div","map-left-list");leftResults.append(selectedMap,cards);
    let inlinePreview=false, inlinePreviewId="", inlineScrollTop=0;
    const resultsLayout = el("div", "listing-results"); resultsLayout.append(leftResults, mapArea); listing.appendChild(resultsLayout); listing.appendChild(compareArea); app.appendChild(listing); render(); if (requestedView === "map") window.requestAnimationFrame(scrollToViewSwitch); // URLで地図を指定して来た人だけ（PCの最初の表示では動かさない）
    const previewBackdrop = el("div", "preview-backdrop"); previewBackdrop.hidden = true;
    const drawer = el("aside", "preview-drawer"); drawer.setAttribute("aria-label", "霊園のプレビュー"); drawer.setAttribute("aria-modal", "true"); drawer.setAttribute("role", "dialog"); drawer.hidden = true;
    const drawerHead = el("div", "preview-head"), drawerName = el("h2", "detail-name", ""), drawerFav = el("button", "favorite-button", "気になる"), openPage = el("a", "text-link", "ページで開く"), closePreview = el("button", "preview-close", "×");
    drawerFav.type="button"; closePreview.type="button"; closePreview.setAttribute("aria-label","プレビューを閉じる"); drawerHead.append(drawerName,drawerFav,openPage,closePreview);
    const backToList = el("button", "preview-back", "\u2190 \u4e00\u89a7\u306b\u623b\u308b"); backToList.type="button";
    const frame = el("iframe", "preview-frame"); frame.title="\u970a\u5712\u306e\u7d39\u4ecb"; drawerHead.insertBefore(backToList, drawerName); drawer.append(drawerHead,frame); app.append(previewBackdrop); leftResults.appendChild(drawer);
    function isInlineMapMode() { return state.view === "map" && window.matchMedia("(min-width: 1024px)").matches; }
    let previewItem=null, previewTrigger=null, previewPushed=false;
    function syncDrawerFavorite() { if(!previewItem) return; const on=readFavorites().includes(previewItem.id); drawerFav.textContent=on?"気になるに入れました":"気になる"; drawerFav.setAttribute("aria-pressed",on?"true":"false"); }
    function closeDrawer(fromPop) { if(drawer.hidden && !inlinePreview)return; const wasInline=inlinePreview; drawer.hidden=previewBackdrop.hidden=true; frame.src="about:blank"; inlinePreview=false; inlinePreviewId=""; drawer.classList.remove("preview-inline"); cards.hidden=false; selectedMap.hidden=!selectedMapId || state.view !== "map" || window.matchMedia("(max-width: 699px)").matches; if(wasInline)leftResults.scrollTop=inlineScrollTop; if(previewPushed&&!fromPop){previewPushed=false;history.back();}else {previewPushed=false;if(!fromPop){const u=new URL(location.href);u.searchParams.delete("preview");history.replaceState(history.state,"",u);}} if(previewTrigger&&previewTrigger.isConnected)previewTrigger.focus({preventScroll:true}); }
    function openDrawer(id, trigger, push) { const item=entries.find((entry)=>entry.id===id); if(!item)return; const useInline=isInlineMapMode(); if(useInline){selectedMapId=item.id; if(mapInstance&&mapInstance.getSource("reien"))mapItems.forEach((entry)=>{if(entry.id===item.id)mapInstance.setFeatureState({source:"reien",id:entry.id},{active:true});else mapInstance.removeFeatureState({source:"reien",id:entry.id},"active");});} if(useInline && !inlinePreview)inlineScrollTop=leftResults.scrollTop; inlinePreview=useInline; inlinePreviewId=useInline?item.id:""; drawer.classList.toggle("preview-inline",useInline); previewItem=item;previewTrigger=trigger||document.activeElement;drawerName.textContent=item.name;openPage.href=reienHref(item.id);frame.src=reienHref(item.id)+"?embed=1";drawer.hidden=previewBackdrop.hidden=!useInline; if(useInline){previewBackdrop.hidden=true;cards.hidden=true;selectedMap.hidden=true;} else drawer.hidden=false; syncDrawerFavorite(); if(push){const u=new URL(location.href);u.searchParams.set("preview",id);history.pushState({hakasitePreview:true},"",u);previewPushed=true;} (useInline?backToList:closePreview).focus({preventScroll:true}); }
    app.addEventListener("click",(event)=>{const anchor=event.target.closest("a.card-more, a.map-popup-link");if(!anchor||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const card=anchor.closest(".reien-card,.map-popup-card");const title=card&&card.querySelector(".card-title,.map-popup-title");const item=entries.find((entry)=>entry.name===title?.textContent);if(!item)return;event.preventDefault();openDrawer(item.id,anchor,true);});
    closePreview.addEventListener("click",()=>closeDrawer(false));backToList.addEventListener("click",()=>closeDrawer(false));previewBackdrop.addEventListener("click",()=>closeDrawer(false));
    document.addEventListener("keydown",(event)=>{if(event.key==="Escape"&&(!drawer.hidden||inlinePreview))closeDrawer(false);});
    window.addEventListener("popstate",()=>{if(!drawer.hidden||inlinePreview)closeDrawer(true);const id=new URLSearchParams(location.search).get("preview");if(id)openDrawer(id,null,false);});
    drawerFav.addEventListener("click",()=>{if(!previewItem)return;let saved=readFavorites();saved=saved.includes(previewItem.id)?saved.filter((id)=>id!==previewItem.id):saved.concat(previewItem.id);try{localStorage.setItem("hakasite.favorites",JSON.stringify(saved));}catch(_){}syncDrawerFavorite();});
    const initialPreview=new URLSearchParams(location.search).get("preview");if(initialPreview)openDrawer(initialPreview,null,false);
    favoritesNote.hidden=state.view!=="favorites";listing.appendChild(favoritesNote);
    if ((site.glossary || []).length) {
      const glossary = el("section", "glossary wrap"); glossary.appendChild(el("h2", "section-title", "はじめての方へ"));
      const dl = el("dl", "glossary-list"); site.glossary.forEach((item) => { dl.appendChild(el("dt", "", item.term)); dl.appendChild(el("dd", "", item.text)); });
      glossary.appendChild(dl); glossary.appendChild(el("p", "muted glossary-note", "くわしい内容は霊園によって違います。")); app.appendChild(glossary);
    }
    const about = el("section", "about wrap"); about.appendChild(el("h2", "section-title", "このサイトについて"));
    about.appendChild(el("p", "", "掲載している内容は、各霊園からいただいた情報をもとにしています。一般のお墓の霊園も載せています。費用や空き状況は変わることがあります。くわしくは各霊園へお確かめください。"));
    const instagramKnowledgeUrl = validUrl(site.instagramKnowledgeUrl);
    if (instagramKnowledgeUrl) { about.appendChild(el("p", "knowledge-link-line", "お墓の基礎知識はInstagramで紹介しています。")); about.appendChild(link(instagramKnowledgeUrl, "Instagramを見る", "text-link")); }
    else if (site.isSample) about.appendChild(el("p", "muted glossary-note", "（お墓の基礎知識のInstagramへのリンクがここに入ります）"));
    app.appendChild(about);
    app.appendChild(publisherSection()); app.appendChild(footer());
  }
  function definitionList(rows) {
    const dl = el("dl", "details-list"); rows.filter((r) => r.value && r.value.length !== 0).forEach((r) => {
      dl.appendChild(el("dt", "", r.label)); const dd = el("dd");
      if (Array.isArray(r.value)) dd.appendChild(tagList(r.value)); else dd.textContent = r.value; dl.appendChild(dd);
    }); return dl;
  }
  function appendDataSection(parent, title, rows, extra) {
    const dl = definitionList(rows); if (!dl.children.length) return;
    const section = el("section", "detail-section"); section.appendChild(el("h2", "section-title", title)); section.appendChild(dl);
    if (extra) section.appendChild(extra); parent.appendChild(section);
  }
  function contactLinks(item) {
    const links = [], c = item.contact || {};
    if (typeof c.tel === "string" && /\d/.test(c.tel)) {
      if (isSampleItem(item)) links.push(el("p", "contact-link", "電話 " + c.tel));
      else { const number = c.tel.replace(/[^0-9+]/g, ""); if (/\d/.test(number)) links.push(link("tel:" + number, "電話をかける " + c.tel, "button contact-button")); }
    }
    if (typeof c.website === "string" && c.website.trim()) { const url = validUrl(c.website); if (url && !isSampleItem(item)) links.push(link(url, "公式サイト", "button button-outline contact-button")); else if (isSampleItem(item)) links.push(el("p", "contact-link", "公式サイト " + c.website)); }
    if (typeof c.instagram === "string" && c.instagram.trim()) { const url = validUrl(c.instagram); if (url && !isSampleItem(item)) links.push(link(url, "霊園のInstagram", "button button-outline contact-button")); else if (isSampleItem(item)) links.push(el("p", "contact-link", "霊園のInstagram " + c.instagram)); } return links;
  }
  function checklistTable(item) {
    const section = el("section", "detail-section checklist-section"); section.id = "checklist"; section.appendChild(el("h2", "section-title", "設備・条件"));
    const table = el("table", "checklist-table"), body = el("tbody");
    checklistRows.forEach(([label, key]) => {
      const tr = el("tr"), th = el("th", "", label), td = el("td"), value = checklistValue(item, key), shown = checklistLabelValue(item, key);
      td.appendChild(el("span", value === "確認中" ? "checklist-status is-unknown" : "checklist-status" + (value === "あり" ? " is-yes" : ""), shown));
      const note = item.checklist && item.checklist[key] && item.checklist[key].note;
      if (note) td.appendChild(el("span", "checklist-note", note));
      tr.appendChild(th); tr.appendChild(td); body.appendChild(tr);
    });
    table.appendChild(body); section.appendChild(table);
    const updated = item.updated || "未確認";
    section.appendChild(el("p", "checklist-note checklist-caption", "公式サイトなどで確かめた内容です（" + updated + "時点）。『確認中』は、まだ確かめられていない項目です。見学の前に霊園へお確かめください。"));
    return section;
  }
  function smallContactBox(item) {
    if (isSampleItem(item)) return null;
    const actual = contactLinks(item), phone = actual.find((node) => node.classList.contains("contact-button") && node.tagName === "A" && node.href.startsWith("tel:"));
    const website = actual.find((node) => node.classList.contains("contact-button") && node.href && /^https?:/.test(node.href) && node.textContent === "公式サイト");
    if (!phone && !website) return null;
    const box = el("aside", "small-contact"); box.appendChild(el("p", "small-contact-copy", "見学・資料のご相談は、霊園へ直接どうぞ"));
    if (phone) box.appendChild(phone.cloneNode(true));
    if (website) { const siteLink = link(website.href, "公式サイト", "small-contact-site"); siteLink.target = "_blank"; siteLink.rel = "noopener"; box.appendChild(siteLink); }
    return box;
  }
  function appendStrengthTitle(parent, text) {
    String(text || "").split(/(?<=、)/u).filter(Boolean).forEach((phrase) => parent.appendChild(el("span", "title-phrase", phrase)));
  }
  function makeReien() {
    const params=new URLSearchParams(window.location.search), embed=params.get("embed")==="1";
    if(embed)document.body.classList.add("is-embed");
    const id = document.body.dataset.reienId || params.get("id"), item = entries.find((e) => e.id === id), band = sampleBand();
    if (!embed) { if (band) app.appendChild(band); app.appendChild(header(true)); const back = el("div", "back-row wrap"); const backLink=link("index.html", "← 霊園の一覧へ", "text-link"); backLink.addEventListener("click",(event)=>{try{const indexPath=new URL("index.html",location.href).pathname; if(document.referrer&&new URL(document.referrer).pathname===indexPath){event.preventDefault();history.back();}}catch(_){}}); back.appendChild(backLink); app.appendChild(back); }
    if (!item) { const missing = el("main", "missing wrap"); missing.appendChild(el("h1", "display-title", "ページが見つかりません")); missing.appendChild(link("index.html", "霊園の一覧へ戻る", "button")); app.appendChild(missing); app.appendChild(publisherSection()); app.appendChild(footer()); return; }
    const main = el("main", "detail-layout wrap"), article = el("article", "detail-article"), hero = el("section", "detail-hero");
    const sampleItem = isSampleItem(item), videoData = item.video || {}, validVideo = validFilename(videoData.src);
    let heroMedia = null;
    if (validVideo && videoData.src) {
      heroMedia = el("video", "hero-video " + (videoData.orientation === "yoko" ? "video-yoko" : "video-tate")); heroMedia.src = "video/" + videoData.src; heroMedia.controls = true; heroMedia.playsInline = true; heroMedia.preload = "metadata"; heroMedia.setAttribute("aria-label", item.name + " の紹介動画");
      if (usablePoster(videoData)) heroMedia.poster = "img/" + videoData.poster;
    } else if (sampleItem) {
      heroMedia = el("div", "photo-frame photo-placeholder video-placeholder " + (videoData.orientation === "yoko" ? "video-yoko" : "video-tate")); heroMedia.appendChild(el("span", "photo-slot", "霊園の紹介動画")); heroMedia.appendChild(el("span", "photo-sample", "サンプル"));
    } else heroMedia = photo(item.photos && item.photos.main, "hero-photo", sampleItem);
    const title = el("h1", "display-title strength-title"); appendStrengthTitle(title, item.strengthText);
    if (heroMedia && videoData.orientation !== "yoko" && (validVideo || sampleItem)) {
      hero.classList.add("hero-tate"); hero.appendChild(heroMedia); const copy = el("div", "hero-copy");
      if (item.strengthType) copy.appendChild(el("p", "strength-badge", item.strengthType)); copy.appendChild(title); copy.appendChild(el("h2", "detail-name", item.name)); if (item.kana) copy.appendChild(el("p", "kana", item.kana)); copy.appendChild(el("p", "area-mark", item.area)); hero.appendChild(copy);
    } else {
      if (heroMedia) hero.appendChild(heroMedia);
      if (item.strengthType) hero.appendChild(el("p", "strength-badge", item.strengthType));
      hero.appendChild(title); hero.appendChild(el("h2", "detail-name", item.name)); if (item.kana) hero.appendChild(el("p", "kana", item.kana)); hero.appendChild(el("p", "area-mark", item.area));
    }
    if (heroMedia) hero.appendChild(heroMedia);
    const quickFacts = el("section", "quick-facts"); quickFacts.setAttribute("aria-label", "ひと目でわかる霊園情報");
    const feeFact = el("div", "quick-fact"); feeFact.appendChild(el("p", "quick-fact-label", "費用")); feeFact.appendChild(el("p", "quick-fact-value", feeSummary(item) || "霊園にお問い合わせください")); feeFact.appendChild(link("#fee", "くわしくは費用の欄へ", "quick-fact-link")); quickFacts.appendChild(feeFact);
    const placeFact = el("div", "quick-fact"); placeFact.appendChild(el("p", "quick-fact-label", "場所")); placeFact.appendChild(el("p", "quick-fact-value", placeSummary(item))); placeFact.appendChild(link("#access", "アクセスを見る", "quick-fact-link")); quickFacts.appendChild(placeFact);
    const moodFact = el("div", "quick-fact"); moodFact.appendChild(el("p", "quick-fact-label", "雰囲気")); moodFact.appendChild(el("p", "quick-fact-value", atmosphereSummary(item))); quickFacts.appendChild(moodFact);
    const typesFact = el("div", "quick-fact"); typesFact.appendChild(el("p", "quick-fact-label", "お墓の種類")); typesFact.appendChild(el("p", "quick-fact-value", (item.graveTypes || []).join("・") || "—")); quickFacts.appendChild(typesFact);
    if (heroMedia) hero.insertBefore(quickFacts, heroMedia); else hero.appendChild(quickFacts);
    if (validVideo && videoData.caption) hero.appendChild(el("p", "muted video-caption", videoData.caption));
    const reelUrl = validUrl(item.reelUrl);
    if (reelUrl && sampleItem) hero.appendChild(el("p", "text-link", "Instagramでも見る"));
    else if (reelUrl && !validVideo) hero.appendChild(link(reelUrl, "Instagramで紹介動画を見る", "button button-outline reel-button"));
    else if (reelUrl) hero.appendChild(link(reelUrl, "Instagramでも見る", "text-link"));
    article.appendChild(hero);
    let detailFavorites=[];try{const saved=JSON.parse(localStorage.getItem("hakasite.favorites")||"[]");if(Array.isArray(saved))detailFavorites=saved.filter((x)=>typeof x==="string");}catch(_){detailFavorites=[];}
    const detailFav=el("button","favorite-button detail-favorite",detailFavorites.includes(item.id)?"気になるに入れました":"気になる");detailFav.type="button";detailFav.setAttribute("aria-pressed",detailFavorites.includes(item.id)?"true":"false");detailFav.addEventListener("click",()=>{try{detailFavorites=detailFavorites.includes(item.id)?detailFavorites.filter((x)=>x!==item.id):detailFavorites.concat(item.id);localStorage.setItem("hakasite.favorites",JSON.stringify(detailFavorites));}catch(_){}detailFav.textContent=detailFavorites.includes(item.id)?"気になるに入れました":"気になる";detailFav.setAttribute("aria-pressed",detailFavorites.includes(item.id)?"true":"false");const headerFav=document.querySelector(".header-favorites");if(headerFav)headerFav.textContent=detailFavorites.length?"気になる（"+detailFavorites.length+"）":"気になる";});
    const detailName=hero.querySelector(".detail-name");if(detailName)detailName.insertAdjacentElement("afterend",detailFav);else hero.appendChild(detailFav);
    const pageNav=el("nav","detail-nav");pageNav.setAttribute("aria-label","このページの中");
    const strengths = el("section", "detail-section strength-section");
    const strengthItems = (item.otherStrengths || []).filter(Boolean), forWhom = (item.forWhom || []).filter(Boolean);
    const strengthPhoto = item.photos && item.photos.strength ? photo(item.photos.strength, "strength-photo", sampleItem) : null; if (strengthPhoto) strengths.appendChild(strengthPhoto);
    if (strengthItems.length) strengths.appendChild(tagList(strengthItems));
    if (forWhom.length) { strengths.appendChild(el("h3", "for-whom-title", "こんな方に")); strengths.appendChild(tagList(forWhom)); }
    if (strengthItems.length || forWhom.length || strengthPhoto) article.appendChild(strengths);
    const galleryItems = item.photos && Array.isArray(item.photos.gallery) ? item.photos.gallery : [];
    const gallerySource = ((validVideo || sampleItem) && item.photos && item.photos.main) ? [item.photos.main].concat(galleryItems) : galleryItems;
    const galleryPhotos = gallerySource.map((p) => photo(p, "gallery-photo", sampleItem)).filter(Boolean);
    if (galleryPhotos.length) { const gallery = el("section", "detail-section"); gallery.id="photos"; const heading = el("div", "gallery-heading"); heading.appendChild(el("h2", "section-title", "写真")); const carousel = galleryPhotos.length > 1; const counter = carousel ? el("span", "muted gallery-count", "1 / " + galleryPhotos.length) : null; if (counter) heading.appendChild(counter); gallery.appendChild(heading); const grid = el("div", carousel ? "gallery-grid is-carousel" : "gallery-grid"); if (carousel) { grid.tabIndex = 0; grid.setAttribute("role", "group"); grid.setAttribute("aria-label", "霊園の写真（横にめくれます）"); } galleryPhotos.forEach((p, i) => { p.dataset.index = String(i); grid.appendChild(p); }); if (carousel) { const updateCount = () => { let best = 0, distance = Infinity; Array.from(grid.children).forEach((node, i) => { const d = Math.abs(node.getBoundingClientRect().left - grid.getBoundingClientRect().left); if (d < distance) { distance = d; best = i; } }); counter.textContent = (best + 1) + " / " + galleryPhotos.length; }; grid.addEventListener("scroll", updateCount, { passive: true }); } gallery.appendChild(grid); article.appendChild(gallery); }
    const burialStyle = Array.isArray(item.burialStyle) ? item.burialStyle : [];
    const hasHakajimaiConsult = item.hakajimaiConsult && item.hakajimaiConsult !== "できない";
    if ((item.graveTypes && item.graveTypes.length) || item.featuredPlan || burialStyle.length || hasHakajimaiConsult) {
    const typesSection = el("section", "detail-section"); typesSection.id="types"; typesSection.appendChild(el("h2", "section-title", "お墓の種類"));
    if (item.graveTypes && item.graveTypes.length) typesSection.appendChild(tagList(item.graveTypes));
    if (burialStyle.length) { typesSection.appendChild(definitionList([{label:"納め方", value:burialStyle}])); }
    if (item.hakajimaiConsult && item.hakajimaiConsult !== "できない") { typesSection.appendChild(definitionList([{label:"墓じまいからの受け入れ相談", value:item.hakajimaiConsult}])); }
    if (item.featuredPlan) typesSection.appendChild(definitionList([{label:"案内している区画", value:item.featuredPlan}]));
    typesSection.appendChild(link("guide.html", "お墓の種類について → はじめてのお墓選び", "text-link guide-type-link"));
    article.appendChild(typesSection);
    }
    article.appendChild(checklistTable(item));
    const tableContact = smallContactBox(item); if (tableContact) article.appendChild(tableContact);
    const feeNote = item.fee ? el("p", "fee-note muted", "霊園の表記のまま載せています。くわしい内訳は霊園へお確かめください。") : null;
    const feeStart=article.children.length; appendDataSection(article, "費用", [{label:"費用", value:item.fee}], feeNote); if(article.children.length>feeStart)article.lastElementChild.id="fee";
    const accessRows = definitionList([{label:"所在地",value:item.address},{label:"行き方",value:item.access},{label:"駐車場",value:item.parking}]);
    const access = el("section", "detail-section"); access.id="access"; access.appendChild(el("h2", "section-title", "アクセス")); if (accessRows.children.length) access.appendChild(accessRows);
    const mapUrl = validUrl(item.mapUrl) || (!item.mapUrl && item.address ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(item.address) : "");
    const canEmbedMap = Boolean(!sampleItem && (!site.isSample || site.internalPreview));
    if (canEmbedMap) {
      const mapFrame = el("div", "map-embed");
      const placeQuery = item.name + (item.address ? " " + item.address : "");
      const placeUrl = site.mapsEmbedKey
        ? "https://www.google.com/maps/embed/v1/place?key=" + encodeURIComponent(site.mapsEmbedKey) + "&q=" + encodeURIComponent(placeQuery) + "&language=ja"
        : "https://maps.google.com/maps?q=" + encodeURIComponent(placeQuery) + "&z=16&hl=ja&output=embed";
      const iframe = el("iframe"); iframe.src = placeUrl; iframe.loading = "lazy"; iframe.referrerPolicy = "no-referrer-when-downgrade"; iframe.title = item.name + " の地図"; mapFrame.appendChild(iframe);
      if (site.mapsEmbedKey && typeof item.lat === "number" && typeof item.lng === "number") {
        const toggle = el("button", "button button-outline map-toggle", "ストリートビューで入口のあたりを見る"); toggle.type = "button";
        toggle.addEventListener("click", () => {
          const street = iframe.dataset.streetView === "true";
          iframe.src = street ? placeUrl : "https://www.google.com/maps/embed/v1/streetview?key=" + encodeURIComponent(site.mapsEmbedKey) + "&location=" + encodeURIComponent(item.lat + "," + item.lng);
          iframe.dataset.streetView = street ? "false" : "true"; toggle.textContent = street ? "ストリートビューで入口のあたりを見る" : "地図に戻す";
        }); mapFrame.appendChild(toggle);
      }
      access.appendChild(mapFrame);
    }
    if (mapUrl && !sampleItem) access.appendChild(link(mapUrl, "地図アプリで開く", "text-link"));
    if (!sampleItem && item.address) { const reviews = link("https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(item.name + " " + item.address), "Googleマップで口コミを見る", "text-link map-reviews"); reviews.target = "_blank"; reviews.rel = "noopener"; access.appendChild(reviews); }
    if (accessRows.children.length || (mapUrl && !sampleItem) || canEmbedMap) article.appendChild(access);
    appendDataSection(article, "基本の情報", [{label:"運営の形",value:item.operationType},{label:"宗旨・宗派",value:item.religion},{label:"設備",value:item.facilities},{label:"開園時間・定休日",value:item.hours}]);
    if (item.managerMessage) { const m = el("section", "manager-note"); m.appendChild(el("h2", "manager-label", "管理している方から")); m.appendChild(el("p", "", item.managerMessage)); article.appendChild(m); }
    const contact = el("section", "detail-section contact-section"); contact.id = "contact"; contact.appendChild(el("h2", "section-title", "問い合わせ・見学")); contact.appendChild(el("p", "", "見学やご相談は、霊園へ直接お問い合わせください。"));
    const actualLinks = contactLinks(item); if (actualLinks.length) actualLinks.forEach((n) => contact.appendChild(n)); else contact.appendChild(el("p", "muted", "問い合わせ先は準備中です")); article.appendChild(contact);
    function locality(entry) {
      const source = String(entry.address || "").replace(/^〒\d{3}-?\d{4}\s*/, "");
      const tokyo = source.match(/東京都(.+?(?:区|市|町|村))/);
      if (tokyo) return tokyo[1];
      const area = String(entry.area || "").replace(/^.+?[都道府県]/, "");
      return area.match(/^.+?(?:区|市|町|村)/)?.[0] || String(entry.city || "");
    }
    function tokyoRegion(entry) {
      const town = locality(entry);
      if (!String(entry.address || entry.area || "").includes("東京都")) return "";
      return /区$/.test(town) ? "23区" : town ? "多摩・島しょ" : "";
    }
    const currentLocality = locality(item), currentRegion = tokyoRegion(item), currentTypes = item.graveTypes || [];
    function geoDistanceKm(a, b) {
      const rad = Math.PI / 180, lat1 = a.lat * rad, lat2 = b.lat * rad;
      const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
      return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    }
    const hasCurrentGeo = item.geo && Number.isFinite(item.geo.lat) && Number.isFinite(item.geo.lng);
    const related = hasCurrentGeo ? entries.map((other, index) => {
      if (other.id === item.id || !other.geo || !Number.isFinite(other.geo.lat) || !Number.isFinite(other.geo.lng)) return null;
      const distance = geoDistanceKm(item.geo, other.geo);
      return distance <= 10 ? { item: other, index, score: 0, reason: "ここから約" + distance.toFixed(1) + "km（直線）", distance } : null;
    }).filter(Boolean).sort((a, b) => a.distance - b.distance || a.index - b.index).slice(0, 3) : entries.map((other, index) => {
      if (other.id === item.id) return null;
      const otherLocality = locality(other), commonTypes = (other.graveTypes || []).filter((type) => currentTypes.includes(type));
      const samePlace = Boolean((currentLocality && otherLocality && currentLocality === otherLocality) || (item.area && item.area === other.area));
      const sameRegion = Boolean(currentRegion && currentRegion === tokyoRegion(other));
      const score = (samePlace ? 3 : 0) + (sameRegion ? 1 : 0) + commonTypes.length;
      if (!score) return null;
      const reasons = [];
      if (samePlace) reasons.push("同じ" + currentLocality);
      else if (sameRegion) reasons.push("同じ" + currentRegion);
      if (commonTypes.length) reasons.push(commonTypes.join("・") + "あり");
      return { item: other, index, score, reason: reasons.join("・") };
    }).filter(Boolean).sort((a, b) => b.score - a.score || a.index - b.index).slice(0, 3);
    if (related.length) {
      const relatedSection = el("section", "detail-section related-section");
      relatedSection.appendChild(el("h2", "section-title", "近くにある霊園"));
      const relatedCards = el("div", "cards");
      let detailFavorites = [];
      try { const saved = JSON.parse(localStorage.getItem("hakasite.favorites") || "[]"); if (Array.isArray(saved)) detailFavorites = saved.filter((id) => typeof id === "string"); } catch (_) {}
      related.forEach(({ item: other, reason }) => relatedCards.appendChild(makeCard(other, {
        reason,
        isFavorite: detailFavorites.includes(other.id),
        onFavorite: (event) => {
          detailFavorites = detailFavorites.includes(other.id) ? detailFavorites.filter((id) => id !== other.id) : detailFavorites.concat(other.id);
          try { localStorage.setItem("hakasite.favorites", JSON.stringify(detailFavorites)); } catch (_) {}
          const saved = detailFavorites.includes(other.id);
          event.currentTarget.textContent = saved ? "気になるに入れました" : "気になる";
          event.currentTarget.setAttribute("aria-pressed", saved ? "true" : "false");
        }
      })));
      relatedSection.appendChild(relatedCards); article.appendChild(relatedSection);
    }
    if (item.updated) { const d = item.updated.match(/^(\d{4})-(\d{2})-(\d{2})$/); let text = d ? d[1] + "年" + Number(d[2]) + "月" + Number(d[3]) + "日時点の内容です。" : item.updated + "時点の内容です。"; if (item.confirmedByReien) text += "霊園に確かめています。"; article.appendChild(el("p", "update-note muted", text)); }
    article.appendChild(el("p", "fine-print muted", "内容は変わることがあります。くわしくは霊園へお確かめください。"));
    const endingContact = smallContactBox(item), relatedSection = article.querySelector(".related-section");
    if (endingContact) { if (relatedSection) article.insertBefore(endingContact, relatedSection); else article.appendChild(endingContact); }
    main.appendChild(article);
    if (actualLinks.length) { const aside = el("aside", "contact-aside"); aside.appendChild(el("p", "aside-label", "問い合わせ・見学")); aside.appendChild(el("p", "", "見学やご相談は、霊園へ直接お問い合わせください。")); actualLinks.forEach((n) => aside.appendChild(n.cloneNode(true))); main.appendChild(aside); const fixedContact = link("#contact", "問い合わせ先を見る", "fixed-contact"); fixedContact.dataset.rendered = "true"; document.body.appendChild(fixedContact); }
    const navLabels = { photos: "写真", types: "お墓の種類", checklist: "設備・条件", fee: "費用", access: "アクセス", contact: "問い合わせ" };
    article.querySelectorAll(".detail-section[id], .contact-section[id]").forEach((section) => {
      if (navLabels[section.id]) pageNav.appendChild(link("#" + section.id, navLabels[section.id], "detail-nav-link"));
    });
    if (pageNav.children.length) hero.insertAdjacentElement("afterend", pageNav);
    app.appendChild(main); if(!embed){app.appendChild(publisherSection()); app.appendChild(footer());}
    if (actualLinks.length && "IntersectionObserver" in window) { const bar = document.querySelector(".fixed-contact"); new IntersectionObserver((records) => { records.forEach((r) => { const passed = r.boundingClientRect.bottom < 0; bar.classList.toggle("is-hidden", r.isIntersecting || passed); }); }).observe(contact); }
  }
  app.replaceChildren();
  document.querySelectorAll("[data-rendered]").forEach((node) => node.remove());
  const currentId = document.body.dataset.reienId || new URLSearchParams(window.location.search).get("id");
  const current = page === "reien" ? entries.find((e) => e.id === currentId) : null;
  setMetadata(current); if (page === "reien") makeReien(); else makeIndex();
}());
