// ==UserScript==
// @name         多选项选择（改版
// @author       Anshild
// @version      1.0.0
// @description  选择困难症？发送你说是xx还是xx还是xx…还是xx，让骰娘替你选择
// @timestamp    17752705061704996576
// @license      MIT
// @homepageURL  1708950544
// ==/UserScript==
if (!seal.ext.find('选择回复')) {
  const ext = seal.ext.new('选择回复', 'Anshild', '1.0.0');
  seal.ext.register(ext);

  ext.onNotCommandReceived = (ctx, msg) => {
    let message = msg.message.trim();  // 先去除首尾空格

    // 判断是否以“你说是”开头（支持全半角空格）
    if (!message.startsWith('你说是')) {
      return;
    }

    // 去除开头的“你说是”，并清理多余空格
    message = message.replace(/^你说是\s*/, '');

    // 清理消息末尾的标点符号（问号、感叹号、句号等）
    message = message.replace(/[？?!！。…～~，,；;：:]*$/, '').trim();

    if (message === '') {
      seal.replyToSender(ctx, msg, "嗯？你想问什么？");
      return;
    }

    // 用“还是”分割选项，并清理每个选项的首尾空格和残留标点
    let arr = message.split('还是').map(item => 
      item.trim().replace(/[？?!！。…～~，,；;：:]*$/, '').trim()
    );

    // 去除空选项
    arr = arr.filter(item => item !== '');

    if (arr.length < 2) {
      seal.replyToSender(ctx, msg, "两个起步明码标价——开玩笑的，但是带着答案来问问题，你的答案也只会有那一个吧。");
      return;
    }

    // 随机选择一个选项
    const Rand = Math.random();
    const num = Math.floor(Rand * arr.length);
    const chosen = arr[num];

    let replyText = '';

    if (arr.length === 2) {
      // 二选一的专属回复（更亲切自然）
      replyText = `二选一吗……那就${chosen}吧。`;
    } else {
      // 三选一及以上的回复（稍正式一点）
      replyText = `那就选${chosen}吧，当然，仅作参考。`;
    }

    seal.replyToSender(ctx, msg, replyText);
  };
}
