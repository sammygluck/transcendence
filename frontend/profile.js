/* global localStorage, fetch */

export async function openProfile(userId) {
    const tpl = document.getElementById("profile-tpl");
    const overlay = tpl.content.cloneNode(true).firstElementChild;
    document.body.appendChild(overlay);
  
    const closeBtn = overlay.querySelector(".close-btn");
    closeBtn.onclick = () => overlay.remove();
  
    const token = localStorage.getItem("token");
    const res   = await fetch(`/user/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data  = await res.json();
    if (!res.ok) { alert(data.error || "Cannot load profile"); return; }
  
    renderView(overlay, data);
  
    const isMe = +userId === window.__CURRENT_USER_ID;
    if (isMe) wireEdit(overlay, data);
  }
  
  function renderView(ov, d) {
    ov.querySelector("#pr-username").textContent = "@" + (d.alias?.trim() || d.username);
    ov.querySelector("#pr-alias")   .textContent = d.alias ?? d.username;
    ov.querySelector("#pr-full")    .textContent = d.full_name || "";
    ov.querySelector("#pr-email")   .textContent = d.email || "";
    ov.querySelector("#pr-created") .textContent = d.created_at || "";
    ov.querySelector("#pr-online")  .textContent = d.online ? "Yes" : "No";
  
    const img = ov.querySelector("#pr-avatar");
    const url = d.avatar ? `/uploads/${d.avatar}?_=${Date.now()}` : "https://via.placeholder.com/80?text=No+Avatar";
    img.src = url;
    // hide private fields if they’re blank (they were pruned by the server)
    ov.querySelectorAll(".private").forEach(el => { if (!el.textContent.trim()) el.style.display = "none"; });
  }
  
  function wireEdit(ov, data) {
    const edit   = ov.querySelector("#pr-edit");
    const save   = ov.querySelector("#pr-save");
    const cancel = ov.querySelector("#pr-cancel");
  
    edit.style.display = "inline-block";
    edit.onclick = () => {
      edit.style.display = "none"; save.style.display = "inline-block"; cancel.style.display = "inline-block";
      ["alias","full","email"].forEach(k => {
        const span = ov.querySelector(`#pr-${k}`);
        const val  = span.textContent;
        span.innerHTML = `<input id="pr-${k}-in" value="${val}" style="width:100%">`;
      });
      ov.querySelector("#pr-avatar")
        .insertAdjacentHTML("afterend",
          `<input id="pr-avatar-in" type="file" accept="image/*" style="display:block;margin:.5rem 0">`
        );
    };
  
    cancel.onclick = () => { ov.remove(); openProfile(data.id); };
  
    save.onclick = async () => {
      const body = {
        alias:     ov.querySelector("#pr-alias-in") .value.trim(),
        full_name: ov.querySelector("#pr-full-in")  .value.trim(),
        email:     ov.querySelector("#pr-email-in") .value.trim()
      };
      const token = localStorage.getItem("token");
      const up   = await fetch("/profile", {
        method:"PUT",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (!up.ok) { alert("Save failed"); return; }
  
      // avatar?
      const imgInput = ov.querySelector("#pr-avatar-in");
      if (imgInput?.files.length) {
        const fd = new FormData(); fd.append("file", imgInput.files[0]);
        await fetch(`/avatar`, { method:"POST",
                     headers:{ Authorization:`Bearer ${token}` }, body: fd });
      }
      ov.remove(); openProfile(data.id);                  // reload fresh view
    };
  }