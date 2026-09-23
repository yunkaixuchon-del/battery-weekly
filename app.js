"use strict";
let data;
const state = {view: "issue", topic: "all", journal: "all", search: "", issue: null};
const $ = (id) => document.getElementById(id);
const escapeHTML = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safeURL = (v) => { try { const u = new URL(v); return u.protocol === "https:" ? u.href : "#"; } catch { return "#"; } };
const findPaper = (doi) => data.papers.find(p => p.doi === doi) || (data.archived_papers || []).find(p => p.doi === doi);
const topicName = (id) => data.topics.find(t => t.id === id)?.name || id;
function authorsHTML(p) {
  const authors = (Array.isArray(p.authors) ? p.authors : []).filter(name => typeof name === "string" && name.trim()).map(name => name.trim());
  return `<p class="paper-authors">${authors.length ? `作者：${authors.map(escapeHTML).join(" · ")}` : "作者信息待补充"}</p>`;
}
function diagramHTML(analysis, basis = "基于摘要") {
  if (!analysis?.diagram?.length) return "";
  return `<p class="diagram-caption">研究路径 · ${escapeHTML(basis)}的示意图</p><ol class="diagram">${analysis.diagram.map(n => `<li><span>${escapeHTML(n.label)}</span><strong>${escapeHTML(n.text)}</strong></li>`).join("")}</ol>`;
}
const translatedTitle = (p) => p.title_translation?.title_zh || p.analysis?.title_zh || p.title;
function paperHTML(p, i) {
  const a = p.analysis;
  return `<article class="paper"><span class="paper-num">${String(i + 1).padStart(2,"0")}</span><div class="paper-content"><h2><button class="title-button" data-doi="${escapeHTML(p.doi)}">${escapeHTML(translatedTitle(p))}</button></h2>${translatedTitle(p) !== p.title ? `<p class="original-title" lang="en">${escapeHTML(p.title)}</p>` : ""}${authorsHTML(p)}${a ? `<p class="takeaway">${escapeHTML(a.takeaway)}</p>${diagramHTML(a,p.basis)}` : `<p class="takeaway muted">${escapeHTML(p.summary_message || "仅收录题录，暂无中文简介。")}</p>`}<div class="paper-tags">${p.topics.map(t => `<span class="topic-tag">${escapeHTML(topicName(t))}</span>`).join("")}${p.content_type_label ? `<span>${escapeHTML(p.content_type_label)}</span>` : ""}<span>${escapeHTML(p.basis)}</span></div></div><aside class="paper-meta"><span class="journal-name">${escapeHTML(p.journal)}</span><time>${escapeHTML(p.published || "发表日期待核实")}</time><a href="${escapeHTML(safeURL(p.url))}" target="_blank" rel="noopener noreferrer">阅读原文 ↗</a></aside></article>`;
}
function render() {
  const issue = data.issues.find(x => x.id === state.issue) || data.issues[0];
  $("volume").textContent = String(Math.max(1, data.issues.length - data.issues.indexOf(issue))).padStart(2,"0");
  $("issue-date").textContent = issue ? `${issue.id} · ${issue.date}` : "文献索引";
  document.querySelectorAll(".nav button").forEach(b => { const active = b.dataset.view === state.view; b.classList.toggle("active",active); if(active)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current"); });
  $("papers").classList.toggle("hidden", state.view === "archive");
  $("archives").classList.toggle("hidden", state.view !== "archive");
  document.querySelector(".tools").classList.toggle("hidden", state.view === "archive");
  $("eyebrow").textContent = state.view === "issue" ? issue?.label || "本期" : state.view === "all" ? "文献索引" : "按周归档";
  $("view-title").textContent = state.view === "archive" ? "历史周报" : state.view === "all" ? "近期精选" : "电池与储能研究";
  $("view-description").textContent = state.view === "archive" ? "每期保留文献、简介和原文出处。" : state.view === "all" ? "保留约 100 篇最相关文献，每周精选 50–100 篇；不足时不凑数。" : issue ? `${issue.from} — ${issue.to} · ${issue.papers.length} 篇精选` : "首期正在整理。";
  if (state.view !== "archive" && data.sort_description) $("view-description").textContent += ` ${data.sort_description}`;
  if (state.view === "archive") {
    $("result-count").textContent = `${data.issues.length} 期周报`;
    $("archives").innerHTML = data.issues.map(x => `<button class="archive-item" data-issue="${escapeHTML(x.id)}"><strong>${escapeHTML(x.id)} · ${escapeHTML(x.label)}</strong><span>${escapeHTML(x.date)} / ${x.papers.length} 篇 →</span></button>`).join("");
    return;
  }
  let papers = state.view === "issue" ? (issue?.papers || []).map(doi => findPaper(doi)).filter(Boolean) : data.papers;
  const total = papers.length;
  papers = papers.filter(p => (state.topic === "all" || p.topics.includes(state.topic)) && (state.journal === "all" || p.journal === state.journal) && (!state.search || [p.title,p.title_translation?.title_zh,p.analysis?.title_zh,p.analysis?.summary_zh,p.journal,p.doi].join(" ").toLowerCase().includes(state.search)));
  $("result-count").textContent = `${papers.length} / ${total} 篇文献`;
  $("papers").innerHTML = papers.length ? papers.map(paperHTML).join("") : `<div class="empty">${total ? "没有符合筛选条件的文献，试试其他关键词或方向。" : "本期暂无符合筛选条件的文献。"}</div>`;
}
function detail(doi) {
  const p = findPaper(doi);
  if (!p) return;
  const a = p.analysis;
  $("detail-content").innerHTML = `<p class="source-note">${escapeHTML(p.journal)} · ${escapeHTML(p.published || "发表日期待核实")} · ${escapeHTML(p.basis)}</p><h2 id="detail-title">${escapeHTML(translatedTitle(p))}</h2><p class="original-title" lang="en">${escapeHTML(p.title)}</p>${a ? `<h3>研究简介</h3><p>${escapeHTML(a.summary_zh)}</p>${diagramHTML(a,p.basis)}<h3>与你的方向相关</h3><p>${escapeHTML(a.relevance)}</p>${a.limitations ? `<h3>阅读时留意</h3><p class="source-note">${escapeHTML(a.limitations)}</p>` : ""}${a.diagram.length ? `<details><summary class="source-note">图示依据</summary>${a.diagram.map(n=>`<p class="evidence" lang="en">${escapeHTML(n.evidence)}</p>`).join("")}</details>` : ""}` : `<p>${escapeHTML(p.summary_message || "仅收录题录，暂无中文简介。")}</p>`}<h3>原文与出处</h3><p class="source-note">${escapeHTML((p.authors || []).slice(0,8).join(" · "))}</p><p><a class="doi-link" href="${escapeHTML(safeURL(p.url))}" target="_blank" rel="noopener noreferrer">${escapeHTML(p.doi)} ↗</a></p><p class="source-note">首次收录：${escapeHTML(p.first_seen)} · 来源：${escapeHTML(p.sources.join(" / "))}<br>简介与示意图依据所标注来源整理，实验细节请核对原文。</p>`;
  $("detail").showModal();
}
document.querySelector(".nav").addEventListener("click", e => { const b=e.target.closest("button[data-view]");if(!b||!data)return;state.view=b.dataset.view;state.issue=null;render(); });
$("topics").addEventListener("click", e => { const b=e.target.closest("button");if(!b||!data)return;state.topic=b.dataset.topic;document.querySelectorAll("#topics button").forEach(n=>{const selected=n===b;n.classList.toggle("selected",selected);n.setAttribute("aria-pressed",String(selected));});render(); });
$("journal").addEventListener("change", e => {state.journal=e.target.value;render();});
$("search").addEventListener("input", e=>{state.search=e.target.value.trim().toLowerCase();if(data)render();});
$("papers").addEventListener("click", e=>{const b=e.target.closest("[data-doi]");if(b)detail(b.dataset.doi);});
$("archives").addEventListener("click",e=>{const b=e.target.closest("[data-issue]");if(b){state.issue=b.dataset.issue;state.view="issue";state.topic="all";state.journal="all";state.search="";$("journal").value="all";$("search").value="";document.querySelectorAll("#topics button").forEach(n=>{const selected=n.dataset.topic==="all";n.classList.toggle("selected",selected);n.setAttribute("aria-pressed",String(selected));});render();}});
$("close-detail").addEventListener("click",()=>$("detail").close());
$("detail").addEventListener("click",e=>{if(e.target===$("detail")){const r=$("detail").getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$("detail").close();}});
fetch("./data.json",{cache:"no-cache"}).then(r=>{if(!r.ok)throw new Error("unavailable");return r.json();}).then(value=>{
  data=value;$("topics").insertAdjacentHTML("beforeend",data.topics.map(t=>`<button data-topic="${escapeHTML(t.id)}" aria-pressed="false">${escapeHTML(t.name)}</button>`).join(""));
  $("journal").insertAdjacentHTML("beforeend",data.journals.map(j=>`<option>${escapeHTML(j)}</option>`).join(""));
  $("source-list").innerHTML=data.journals.map(j=>`<span>${escapeHTML(j)}</span>`).join("");
  $("source-heading").textContent=`期刊来源 · ${data.journals.length} 本`;
  $("last-updated").textContent="最近更新："+new Intl.DateTimeFormat("zh-CN",{timeZone:"Asia/Shanghai",dateStyle:"medium",timeStyle:"short"}).format(new Date(data.updated_at));
  render();
}).catch(()=>{$("view-description").textContent="文献暂时无法载入，请稍后刷新。";$("result-count").textContent="读取失败";$("papers").innerHTML='<div class="empty">暂时无法读取文献数据。</div>';});
