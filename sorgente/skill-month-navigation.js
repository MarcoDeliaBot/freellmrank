// The document stays frozen. Resolve available neighbours from a local index.
// With no JavaScript or no neighbour, the permanent archive hub remains valid.
(async function () {
  const nav=document.querySelector('[data-month]');
  if(!nav)return;
  try {
    const response=await fetch('/skill-months.json');
    if(!response.ok)return;
    const months=await response.json(),index=months.indexOf(nav.dataset.month);
    for(const [selector,month,label] of [['[data-month-previous]',months[index-1],'Previous month'],['[data-month-next]',months[index+1],'Next month']]) {
      if(!/^\d{4}-\d{2}$/.test(month||''))continue;
      const link=nav.querySelector(selector);
      link.href=`/skills/best-agent-skills-${month}.html`;
      link.textContent=`${label} · ${month}`;
    }
  } catch { /* The archive hub is always available. */ }
})();
