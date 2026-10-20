const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORAGE = 'greenhouse-patrol-demo-v1';
let saved = {assigned: {}, records: {}, followups: {}, pilot: ''};
try {
  const data = JSON.parse(localStorage.getItem(STORAGE));
  if (data && data.assigned && data.records && data.followups) saved = data;
} catch {}
let view = 'farmer', selected = 'g2', filter = 'all', query = '', toastTimer;
const shed = () => DEMO.sheds.find(s => s.id === selected);
function persist() {
  try { localStorage.setItem(STORAGE, JSON.stringify(saved)); }
  catch { notify('当前浏览器无法保存；本次记录仅在页面内保留'); }
}
function notify(text) {
  $('#toast').textContent = text;
  $('#toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 3200);
}
function go(next) {
  if (location.hash.slice(1) === next) render(); else location.hash = next;
  window.scrollTo({top: 0, behavior: 'instant'});
}
function render() {
  const hash = location.hash.slice(1);
  view = ['farmer', 'manager', 'message'].includes(hash) ? hash : 'farmer';
  $('#main').innerHTML = `<section class="page page-${view}">${view === 'manager' ? manager() : view === 'message' ? message() : farmer()}</section>`;
  document.querySelectorAll('[data-view]').forEach(b => {
    const active = b.dataset.view === (view === 'message' ? 'farmer' : view);
    b.classList.toggle('active', active);
    b.setAttribute('aria-current', active ? 'page' : 'false');
    b.onclick = () => go(b.dataset.view);
  });
  bind();
}
function shedArt() {
  return `<svg viewBox="0 0 190 90" aria-hidden="true"><path class="ground" d="M6 80h178"/><path class="roof" d="M18 77V52C18 7 93 7 93 52v25z"/><path class="roof back" d="M93 77V52c0-18-12-31-27-34l57-7c23-3 49 12 49 34v32z"/><path class="ribs" d="M44 77V46c0-12 7-23 16-28m62 59V49c0-19-13-30-27-34m51 62V47c0-19-12-30-23-36M21 50h70m5-2 72-5"/><path class="door" d="M49 77V52h18v25"/><circle class="sensor" cx="119" cy="58" r="4"/></svg>`;
}
function contextLine() {
  return `<div class="context-line"><span>${DEMO.farm} <b>·</b> ${DEMO.scope}</span><span>固定演示时刻 ${DEMO.time}</span></div>`;
}
function farmer() {
  const s = shed(), assigned = saved.assigned[s.id], record = saved.records[s.id];
  return `${contextLine()}<div class="hero"><div><p class="eyebrow">今日巡护</p><h1>${s.title}<br><em>${s.conclusion}</em></h1><p class="lede">${s.brief}</p></div><div class="hero-side"><span class="simulation">所有设备读数均为模拟</span><button class="text-btn" id="message-entry">从提醒消息开始演示 ↗</button><button class="text-btn" id="pilot">基础套件与试点 ↗</button></div></div>
  <div class="farm-grid"><aside class="shed-list" aria-label="选择大棚"><div class="section-label">看哪座棚 <span>设备与棚形为示意</span></div>${DEMO.sheds.map(x => `<button class="shed ${x.id === selected ? 'selected' : ''}" data-shed="${x.id}" aria-pressed="${x.id === selected}"><div>${shedArt()}</div><span><strong>${x.name}</strong><small>${x.label}</small></span><b aria-hidden="true">↗</b></button>`).join('')}</aside>
  <article class="patrol-panel"><div class="panel-heading"><h2>${s.name} · 巡护处理</h2><span class="status">${record ? '回执已录 · 待复核' : assigned ? '已记录核实安排' : '待人工核实'}</span></div><div class="readings">${s.values.map(v => `<div><span>${v[0]}</span><strong>${v[1]}</strong><small>${v[2]}</small></div>`).join('')}</div>
  <ol class="workflow"><li class="done">发现异常</li><li class="${record && record.result !== '仍待现场核实' ? 'done' : assigned ? 'current' : ''}">现场核实</li><li class="${record ? 'done' : ''}">记录回执</li></ol>
  <div class="patrol-copy"><p>${s.checks[0]}</p><button class="text-btn" id="evidence">查看原始依据与巡护说明 ↗</button></div>
  ${record ? `<div class="receipt"><span>管理员回执 · 本机演示记录</span><strong>${esc(record.result)}</strong><p>${esc(record.note)}</p><small>现场反馈已记录，设备状态仍需服务人员复核。</small></div>` : ''}
  <div class="panel-actions"><button class="secondary" id="assign">${assigned ? '已记录核实安排 ✓' : '安排现场核实'}</button><button class="primary" id="record">${record ? '修改处理回执' : '记录现场处理'} <span>→</span></button></div>
  </article></div>
  <div class="handoff-band"><div><span>同一座棚，两端接着处理</span><strong>${record ? '现场已有回执，服务端继续跟进。' : '现场记录，会同步到服务端。'}</strong></div><button class="primary quiet" data-view="manager">查看服务端 →</button></div>
  `;
}
function rows() {
  const list = DEMO.sheds.filter(s => (filter === 'all' || (filter === 'receipt' ? saved.records[s.id] : !saved.followups[s.id])) && `${s.name}${s.label}${s.service}`.includes(query));
  return list.length ? list.map(s => `<tr class="${s.id === selected ? 'selected' : ''}"><td><button data-select="${s.id}"><strong>${s.name}</strong><small>${s.label}</small></button></td><td>${saved.records[s.id] ? '已录回执' : saved.assigned[s.id] ? '核实安排已录' : '待现场核实'}</td><td>${saved.followups[s.id] ? '跟进已安排' : '待跟进'}</td><td><button class="text-btn" data-select="${s.id}" aria-label="查看${s.name}">查看 →</button></td></tr>`).join('') : '<tr><td class="empty" colspan="4">没有符合条件的大棚。可清空搜索或切换“全部”。</td></tr>';
}
function manager() {
  const s = shed(), record = saved.records[s.id], followup = saved.followups[s.id];
  return `${contextLine()}<div class="hero service-hero"><div><p class="eyebrow">客户经理与服务伙伴</p><h1>巡护之后，<em>服务接上。</em></h1></div><div class="hero-side"><span class="simulation">同一浏览器内的演示联动</span><button class="primary" id="pilot">基础套件与试点 →</button></div></div>
  <div class="service-grid"><div class="service-left"><div class="table-heading"><h2>这家合作社，需要跟进什么？</h2><span>${Object.keys(saved.records).length} 份现场回执 · ${Object.keys(saved.followups).length} 项跟进</span></div><div class="table-toolbar"><div class="filters">${[['all','全部'],['pending','待跟进'],['receipt','已有回执']].map(([value,label]) => `<button class="${filter === value ? 'active' : ''}" data-filter="${value}">${label}</button>`).join('')}</div><input id="search" type="search" placeholder="搜索大棚或问题" aria-label="搜索大棚或问题" value="${esc(query)}"></div><div class="table-wrap"><table><thead><tr><th>大棚与信号</th><th>现场进展</th><th>服务进展</th><th>详情</th></tr></thead><tbody id="rows">${rows()}</tbody></table></div>
  <div class="service-record"><div><p class="eyebrow">${s.name} / 管理员回执 · 待复核</p>${record ? `<h3>${esc(record.result)}</h3><p>${esc(record.note)}</p>` : '<h3>等待现场核实。</h3>'}</div><button class="text-btn" data-view="farmer">查看同一座棚 →</button></div></div>
  <aside class="service-detail"><span class="eyebrow">${s.name} / 下一步</span><h2>${s.service}</h2><p>${s.match}</p><div class="service-owner"><span>协作方式</span><strong>客户经理协调<br>维护伙伴现场处理</strong></div>${followup ? `<div class="followup-saved"><span>已安排 · ${esc(followup.date)}</span><strong>${esc(followup.owner)}</strong><p>${esc(followup.task)}</p></div>` : '<p class="detail-note">原因未核实前，先记录待办和责任分工。</p>'}<button class="primary" id="follow">${followup ? '修改跟进安排' : '安排服务跟进'} →</button><button class="text-btn" id="export-records">下载巡护与跟进记录 ↓</button></aside></div>
  <div class="kit-strip"><div><span>可以怎样交付</span><strong>基础监测套件 + 持续服务</strong></div><ol><li>传感器与网关</li><li>现场连接</li><li>巡护应用</li><li>安装与维护</li></ol></div><div class="under-note"><span>价格、型号、网络与交付主体，需勘查后确认。</span><span>${saved.pilot ? `本机试点意向：${esc(saved.pilot)}` : '当前无真实试点或成交记录'}</span></div>`;
}
function message() {
  return `<div class="message-stage"><div><p class="eyebrow">从一条提醒开始</p><h1>哪座棚要看，<br><em>打开就知道。</em></h1><p class="lede">提醒里带上棚号、异常依据和下一步。</p><p class="message-note">模拟消息 · 未发送短信<br>场景、设备与合作社均为虚构</p></div><div class="phone"><div class="phone-bar">09:42 <span>巡护提醒</span></div><div class="sms"><span>示例蔬菜合作社 · 2 号棚</span><h2>22 分钟没有新数据</h2><p>最近上报在 09:20。当前棚内环境状态未知，请安排现场核实。</p><button class="primary" id="open-report">查看依据与处理 →</button><small>固定演示数据 · 非真实设备告警</small></div><div class="phone-bottom"></div></div></div>`;
}
function bind() {
  document.querySelectorAll('[data-shed],[data-select]').forEach(b => b.onclick = () => { selected = b.dataset.shed || b.dataset.select; render(); });
  document.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { filter = b.dataset.filter; render(); });
  if ($('#search')) $('#search').oninput = e => { query = e.target.value.trim(); $('#rows').innerHTML = rows(); document.querySelectorAll('[data-select]').forEach(b => b.onclick = () => { selected = b.dataset.select; render(); }); };
  const actions = {evidence, record, follow, pilot, 'export-records': exportRecords, 'message-entry': () => go('message'), 'open-report': () => { selected = 'g2'; go('farmer'); }};
  Object.entries(actions).forEach(([id,fn]) => { if ($('#'+id)) $('#'+id).onclick = fn; });
  if ($('#assign')) $('#assign').onclick = () => { saved.assigned[selected] = true; persist(); render(); notify('已记录核实安排 · 本机演示，不会派单'); };
}
function modal(label, html) {
  $('#dialog-label').textContent = label;
  $('#dialog-body').innerHTML = html;
  if (!$('#dialog').open) $('#dialog').showModal();
  $('#dialog').scrollTop = 0;
  $('#close-dialog').focus();
}
function evidence() {
  const s = shed();
  modal(`${s.name} / 事实、说明与行动`, `<h2>先看依据，再决定怎么处理。</h2><span class="simulation">以下为固定模拟记录</span><h3>已有记录</h3><ul>${s.facts.map(f => `<li>${f}</li>`).join('')}</ul><div class="draft"><span>AI 巡护说明 · 本地模板演示</span><p>${s.summary}</p></div><h3>人工核实步骤</h3><ol>${s.checks.map(c => `<li>${c}</li>`).join('')}</ol><p class="modal-note">传感器数据有效性、确定性规则和人工复核共同支撑处理。大模型可辅助解释与记录；本演示未接入模型、设备或自动控制。</p>`);
}
function record() {
  const s = shed(), previous = saved.records[s.id];
  modal(`${s.name} / 现场回执`, `<h2>把现场情况，留给下一位处理人。</h2><p>模拟填写，不会改变设备状态。回执保存后，服务端可以查看。</p><form id="record-form"><label for="record-result">现场反馈</label><select id="record-result" required><option value="">选择实际核实后的结果</option>${s.options.map(o => `<option value="${esc(o)}" ${previous?.result === o ? 'selected' : ''}>${o}</option>`).join('')}</select><label for="record-note">检查情况与下一步</label><textarea id="record-note" maxlength="400" required placeholder="例如：已请维护人员核对网关状态，等待进一步复核。">${esc(previous?.note || '')}</textarea><label class="check"><input type="checkbox" id="record-confirm" required>我理解这是本机演示回执，设备仍需实际复核。</label><div class="form-error" id="form-error" role="status"></div><button class="primary" type="submit">保存现场回执 →</button></form>`);
  $('#record-form').onsubmit = e => {
    e.preventDefault();
    const result = $('#record-result').value, note = $('#record-note').value.trim();
    if (!result || !note || !$('#record-confirm').checked) { $('#form-error').textContent = '请填写反馈、检查情况，并确认演示范围。'; return; }
    saved.records[s.id] = {result, note}; saved.assigned[s.id] = true;
    persist(); $('#dialog').close(); render(); notify('回执已保存，服务端可查看 · 待实际复核');
  };
}
function follow() {
  const s = shed(), previous = saved.followups[s.id];
  modal(`${s.name} / 服务跟进`, `<h2>把下一步交给明确的人。</h2><p>本机演示待办，不会联系客户、维护人员或提交业务系统。</p><form id="follow-form"><label for="follow-owner">跟进角色</label><select id="follow-owner">${['客户经理协调','设备与网络维护伙伴','农业专业伙伴'].map(o => `<option ${previous?.owner === o ? 'selected' : ''}>${o}</option>`).join('')}</select><label for="follow-date">计划日期</label><input id="follow-date" type="date" required value="${esc(previous?.date || '2026-10-21')}"><label for="follow-task">需要核实什么</label><textarea id="follow-task" required maxlength="400">${esc(previous?.task || s.service + '；根据现场回执确认下一步。')}</textarea><div class="form-error" id="form-error" role="status"></div><button class="primary" type="submit">保存跟进安排 →</button></form>`);
  $('#follow-form').onsubmit = e => {
    e.preventDefault();
    const owner = $('#follow-owner').value, date = $('#follow-date').value, task = $('#follow-task').value.trim();
    if (!date || !task) { $('#form-error').textContent = '请填写日期与核实事项。'; return; }
    saved.followups[s.id] = {owner, date, task}; persist(); $('#dialog').close(); render(); notify('跟进安排已保存 · 未发送消息');
  };
}
function pilot() {
  modal('基础套件 / 待共同确认的试点', `<h2>先验证巡护，再决定怎样采购。</h2><p>面向农业企业或合作社的 To B 场景。建议从同一园区 2–3 座棚开始，优先复用已有设备。</p><div class="kit-grid"><div><h3>设备与安装</h3><p>按需要配置传感器、网关与摄像头，核实接口和安装条件。</p><small>一次性费用 · 勘查后报价</small></div><div><h3>连接与平台</h3><p>按现场选择网络，提供告警、巡护记录和设备状态查看。</p><small>连接与平台服务 · 周期费用待定</small></div><div><h3>持续维护</h3><p>明确谁处理断线、校准、维修和软件更新。</p><small>维护服务 · 内容与费用单列</small></div></div><h3>先看这些结果</h3><ul><li>异常发现与确认用时。</li><li>有效告警比例、漏报与重复提醒。</li><li>巡护记录是否完整，复核花多少时间。</li><li>设备在线率、上门次数与每棚维护成本。</li></ul><p class="modal-note">试点周期与任务共同约定。节水、增产和病害防治效果需要合适生产周期及专业对照，本演示没有这些结果。</p><h3>怎样分工</h3><p>终端渠道讨论选品与供货；政企团队协调客户与连接；硬件及农业伙伴负责现场和专业适配；我方聚焦应用、交互与评测。各方责任和授权待确认。</p><form id="pilot-form"><label for="pilot-intent">模拟客户反馈（不构成订单）</label><select id="pilot-intent" required><option value="">请选择</option>${['愿意安排现场勘查','需先明确价格与维护责任','暂不考虑试点'].map(o => `<option ${saved.pilot === o ? 'selected' : ''}>${o}</option>`).join('')}</select><button class="primary" type="submit">保存本机反馈</button><button class="secondary" id="download-pilot" type="button">下载试点讨论清单 ↓</button></form>`);
  $('#pilot-form').onsubmit = e => { e.preventDefault(); saved.pilot = $('#pilot-intent').value; persist(); $('#dialog').close(); render(); notify('已保存本机意向 · 非真实试点或成交'); };
  $('#download-pilot').onclick = () => downloadText('大棚巡护_试点讨论清单.txt', `大棚巡护｜试点讨论清单\n合作提案演示；非真实订单。\n\n客户：农业企业或合作社，具体主体待确认。\n范围：建议同一园区 2–3 座棚，优先复用已有设备。\n任务：异常发现、人工核实、回执与服务跟进。\n设备：传感器、网关、摄像头按任务选择；接口、网络与安装条件待现场确认。\n指标：发现和确认用时、有效告警、漏报、完整记录、设备在线率、维护成本。\n分工：客户方负责人、终端供货方、连接服务方、安装维护方、农业伙伴、应用团队需逐项确认。\n费用：设备及安装、连接及平台、持续维护分别报价；当前无正式售价。\n停止或调整：数据无法稳定获取、误报负担过高、现场维护无人承担或客户不愿付费。\n不以本演示承诺节水、增产或病害防治效果。\n数据、授权、验收和试点周期由实际合作方约定。\n`);
}
function exportRecords() {
  const blocks = DEMO.sheds.map(s => {
    const r = saved.records[s.id], f = saved.followups[s.id];
    return [s.name, '模拟信号：' + s.label, r ? `管理员回执：${r.result}\n${r.note}` : '现场回执：暂无', f ? `跟进：${f.date} / ${f.owner}\n${f.task}` : '跟进：暂未安排'].join('\n');
  });
  downloadText('大棚巡护_本机演示记录.txt', ['大棚巡护｜本机演示记录', '所有场景与设备数据为模拟；未联系客户或接入设备。', '现场反馈不等于设备状态已经复核。', ...blocks].join('\n\n'));
}
function downloadText(name, text) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([text], {type: 'text/plain;charset=utf-8'}));
  link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  notify('讨论材料已生成 · 演示用途');
}
function about() {
  modal('资料依据 / 演示边界', `<h2>场景有依据，数据是模拟。</h2><p>业务方向依据用户提供《AI 终端 To B 与 To G 业务补充调研》中的智慧大棚场景。当前合作社、棚号、设备、读数、时间线与处理记录均为演示设定。</p><h3>公开案例线索</h3><p>广东省农业农村厅的智慧农业案例名单列有联通相关产业公司申报的温室大棚项目。名单支持生态中存在项目线索；项目效果、华盛参与情况仍需另外核验。</p><a class="source-link" href="${DEMO.source}" target="_blank" rel="noopener">查看官方案例名单 PDF · 第 2 页第 19 项 ↗</a><h3>本次可以实际操作</h3><p>查看模拟依据、记录核实安排、填写回执、两端切换、安排跟进和下载讨论材料。记录只保存在当前浏览器。</p><h3>等待真实接入</h3><p>传感器、摄像头、网关、网络平台、消息通道、业务系统和模型服务均未接入。AI 说明采用本地模板；不会控制通风、灌溉或水肥设备。</p><h3>待验证的商业条件</h3><p>购买方、预算、设备接口、安装维护伙伴、服务成本与付费意愿。演示没有真实试点、成交、增产或节水效果；也不代表任何一方官方授权。</p>`);
}
document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => go(b.dataset.view));
$('#about').onclick = about; $('#source-footer').onclick = about;
$('#close-dialog').onclick = () => $('#dialog').close();
$('#dialog').addEventListener('click', e => {
  if (e.target !== $('#dialog')) return;
  const r = $('#dialog').getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) $('#dialog').close();
});
window.addEventListener('hashchange', render);
window.addEventListener('storage', e => {
  if (e.key !== STORAGE || !e.newValue) return;
  try { const data = JSON.parse(e.newValue); if (data.assigned && data.records && data.followups) { saved = data; render(); } } catch {}
});
render();
