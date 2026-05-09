// ==UserScript==
// @name 日志计时器
// @author Anshild
// @version 2.1.8
// @description .log end（无名称）直接删除当前正在计时的记录 + 严格群隔离
// @timestamp 1743750000
// @license Apache-2
// @homepageURL https://github.com/Anshild/Universesystem/edit/main/Esnavi/%E6%97%A5%E5%BF%97%E8%AE%A1%E6%97%B6.js
// @sealVersion 1.4.5
// ==/UserScript==

"use strict";

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const  = totalSec % 60;
  if (h > 0) return `${h}小时${m}分钟${}秒`;
  if (m > 0) return `${m}分钟${}秒`;
  return `${}秒`;
}

function formatDateTime(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ` +
         `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}

function getKey(groupId, logName) {
  return `LOG_TIMER_${groupId}_${logName}`;
}

function getCurrentActiveLog(ext, groupId) {
  const listKey = `LOG_TIMER_${groupId}_LIST`;
  let listJson = ext.storageGet(listKey);
  if (!listJson || listJson === "") return null;
  try {
    const names = JSON.parse(listJson);
    for (let name of names) {
      let json = ext.storageGet(getKey(groupId, name));
      if (json && json !== "") {
        let data = JSON.parse(json);
        if (data && data.begin === true) {
          return { logName: name, data };
        }
      }
    }
  } catch (e) {}
  return null;
}

function updateLogNameList(ext, groupId, logName) {
  if (!logName) return;
  logName = logName.trim();
  const listKey = `LOG_TIMER_${groupId}_LIST`;
  let listJson = ext.storageGet(listKey);
  let names = listJson && listJson !== "" ? JSON.parse(listJson) : [];
  if (!names.includes(logName)) {
    names.push(logName);
    ext.storageSet(listKey, JSON.stringify(names));
  }
}

function removeLogNameList(ext, groupId, logName) {
  if (!logName) return;
  logName = logName.trim();
  const listKey = `LOG_TIMER_${groupId}_LIST`;
  let listJson = ext.storageGet(listKey);
  if (!listJson || listJson === "") return;
  try {
    let names = JSON.parse(listJson);
    const idx = names.indexOf(logName);
    if (idx > -1) {
      names.splice(idx, 1);
      ext.storageSet(listKey, names.length === 0 ? "" : JSON.stringify(names));
    }
  } catch (e) {}
}

// ====================== 主函数 ======================
function main() {
  let ext = seal.ext.find("log-timer");
  if (!ext) {
    ext = seal.ext.new("log-timer", "Anshild", "2.1.8");
    seal.ext.register(ext);
  }

  ext.onCommandReceived = (ctx, msg, cmdArgs) => {
    if (msg.messageType !== "group" || cmdArgs.command !== "log") return;

    const args = cmdArgs.args || [];
    let action = args[0] ? args[0].toLowerCase().trim() : "";
    let inputName = (args[1] || "").trim();
    const now = Date.now();

    // 1. 纯 .log → 实时显示所有记录
    if (action === "") {
      const listKey = `LOG_TIMER_${msg.groupId}_LIST`;
      let listJson = ext.storageGet(listKey);
      let logs = [];
      if (listJson && listJson !== "") {
        try {
          const names = JSON.parse(listJson);
          for (let name of names) {
            let json = ext.storageGet(getKey(msg.groupId, name));
            if (json && json !== "") {
              let data = JSON.parse(json);
              if (data) {
                let displayTime = data.totalTime || 0;
                let status = "已暂停";
                if (data.begin === true) {
                  displayTime += (now - (data.lastBeginTime || now));
                  status = "正在计时";
                }
                logs.push({ logName: name, displayTime, status });
              }
            }
          }
        } catch (e) {}
      }

      let reply = logs.length === 0
        ? "『当前没有日志记录。』"
        : "当前日志记录：\n" + logs.map(log =>
            `《${log.logName}》 ${log.status}：${formatTime(log.displayTime)}`
          ).join("\n");

      seal.replyToSender(ctx, msg, reply);
      return;
    }

    // 2. .log new
    if (action === "new") {
      if (!inputName) return seal.replyToSender(ctx, msg, "请指定剧目名称，例如 .log new 01");
      updateLogNameList(ext, msg.groupId, inputName);
      const key = getKey(msg.groupId, inputName);
      const info = { begin: true, totalTime: 0, lastBeginTime: now, lastEndTime: now };
      ext.storageSet(key, JSON.stringify(info));
      seal.replyToSender(ctx, msg, `『新剧目——《${inputName}》于${formatDateTime(now)}开始，祝各位都能找到自己的路。』`);
      return;
    }

    // 3. on / off / end
    let logName = inputName;
    if (!logName) {
      const current = getCurrentActiveLog(ext, msg.groupId);
      if (!current) {
        return seal.replyToSender(ctx, msg, `『当前没有正在进行的计时记录，无法${action}。』`);
      }
      logName = current.logName;
    }

    // 按ReScript方式设置临时变量
    seal.vars.strSet(ctx, "$t记录名称", logName);

    const key = getKey(msg.groupId, logName);
    let json = ext.storageGet(key);
    let data = json && json !== "" ? JSON.parse(json) : { begin: false, totalTime: 0, lastBeginTime: now, lastEndTime: now };

    if (action === "on") {
      const info = { begin: true, totalTime: data.totalTime || 0, lastBeginTime: now, lastEndTime: data.lastEndTime || now };
      ext.storageSet(key, JSON.stringify(info));
      seal.replyToSender(ctx, msg, `『剧目《${logName}》在${formatDateTime(now)}继续演出，请各位观众保持安静。\n截止目前累计时长：${formatTime(data.totalTime || 0)}\n上一次停止：${formatDateTime(data.lastEndTime || now)}』`);
    } else if (action === "off") {
      if (data.begin) {
        const currentTime = now - data.lastBeginTime;
        const newTotal = (data.totalTime || 0) + currentTime;
        const info = { begin: false, totalTime: newTotal, lastBeginTime: data.lastBeginTime, lastEndTime: now };
        ext.storageSet(key, JSON.stringify(info));
        seal.replyToSender(ctx, msg, `『剧目《${logName}》于${formatDateTime(now)}停止演出。\n本次时长：${formatTime(currentTime)}\n目前累计时长：${formatTime(newTotal)}』`);
      } else {
        seal.replyToSender(ctx, msg, `『剧目《${logName}》当前未在计时中。』`);
      }
    } else if (action === "end" || action === "halt") {
      let finalTotal = data.totalTime || 0;
      if (data.begin) finalTotal += (now - data.lastBeginTime);

      ext.storageSet(key, "");
      removeLogNameList(ext, msg.groupId, logName);

      seal.replyToSender(ctx, msg, `故事已经来到了尾声，沙漏上方最后一粒沙子也归入了它同伴的怀抱，期待我们的再次相遇，亲爱的剧作家。\n《${logName}》结束时间：${formatDateTime(now)}\n累计时长：${formatTime(finalTotal)}，已清除记录。`);
    }
  };
}

main();
