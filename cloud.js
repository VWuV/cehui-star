/* =====================================================================
 * 云端通用模块（LeanCloud 国际版 REST API）
 * 学生端与老师端共用；无需第三方库，纯浏览器 JS。
 * ===================================================================== */
(function () {
  "use strict";

  /* ---------- MD5（用于 LeanCloud 请求签名，使用 SparkMD5 实现） ---------- */
  function md5(msg) {
    if (!window.SparkMD5) throw new Error("SparkMD5 未加载（请确认 vendor/spark-md5.min.js 存在）");
    return window.SparkMD5.hash(String(msg));
  }

  function base() {
    var cfg = window.CLOUD_CONFIG || {};
    return cfg.apiBase || "https://api.leancloud.app/1.1";
  }

  function headers() {
    var cfg = window.CLOUD_CONFIG || {};
    var ts = Math.floor(Date.now() / 1000);
    return {
      "X-LC-Id": cfg.appId,
      "X-LC-Key": cfg.appKey,
      "X-LC-Sign": ts + "," + md5(cfg.appKey + ts),
      "Content-Type": "application/json"
    };
  }

  /* 学生提交：按 学号+表格 查重，有则更新、无则新建 */
  async function upsert(payload) {
    var where = encodeURIComponent(JSON.stringify({ studentId: payload.studentId, tableId: payload.tableId }));
    var q = await fetch(base() + "/classes/StudentRecord?where=" + where + "&limit=1", { headers: headers() });
    if (!q.ok) throw new Error("云端查询失败(" + q.status + ")");
    var qj = await q.json();
    if (qj.results && qj.results.length) {
      var id = qj.results[0].objectId;
      var r = await fetch(base() + "/classes/StudentRecord/" + id, { method: "PUT", headers: headers(), body: JSON.stringify(payload) });
      if (!r.ok) throw new Error("云端更新失败(" + r.status + ")");
    } else {
      var r2 = await fetch(base() + "/classes/StudentRecord", { method: "POST", headers: headers(), body: JSON.stringify(payload) });
      if (!r2.ok) throw new Error("云端写入失败(" + r2.status + ")");
    }
  }

  /* 老师端：分页读取全部提交记录 */
  async function listAll() {
    var out = [];
    var skip = 0;
    var page = 200;
    while (true) {
      var r = await fetch(base() + "/classes/StudentRecord?limit=" + page + "&skip=" + skip + "&order=-updatedAt", { headers: headers() });
      if (!r.ok) throw new Error("读取失败(" + r.status + ")");
      var j = await r.json();
      var arr = j.results || [];
      for (var i = 0; i < arr.length; i++) out.push(arr[i]);
      if (arr.length < page) break;
      skip += page;
    }
    return out;
  }

  async function del(id) {
    var r = await fetch(base() + "/classes/StudentRecord/" + id, { method: "DELETE", headers: headers() });
    if (!r.ok) throw new Error("删除失败(" + r.status + ")");
  }

  window.CLOUD = { md5: md5, headers: headers, upsert: upsert, listAll: listAll, del: del };
})();
