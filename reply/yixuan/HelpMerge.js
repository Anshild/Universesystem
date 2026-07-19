// ==UserScript==
// @name         help合并转发
// @author       顾轩
// @version      1.6.5
// @description  help太多了干脆弄成合并转发。
// @timestamp    1777203605
// @license     Apache-2
// @homepageURL  https://github.com/Anshild/Universesystem/tree/main
// @updateUrl  https://raw.githubusercontent.com/Anshild/Universesystem/refs/heads/main/reply/yixuan/HelpMerge.js
// ==/UserScript==

"use strict";

if (!seal.ext.find('replyduochong')) {
    var ext = seal.ext.new('replyduochong', '改自YogSothoth', '1.6.5');
    seal.ext.register(ext);

    seal.ext.registerStringConfig(ext, 'napcat_http_url', 'http://127.0.0.1:3000');
    seal.ext.registerStringConfig(ext, 'napcat_token', '');

    function extractQQ(platformId) {
        var m = String(platformId || '').match(/(\d+)/);
        return m ? m[1] : '10000';
    }

    function parseContent(raw) {
        var segments = String(raw).split('——').map(s => s.trim()).filter(s => s.length > 0);
        return segments;
    }

    function buildMessageSegments(text) {
        var segments = [];
        var remaining = text;

        while (remaining.length > 0) {
            var startIdx = remaining.indexOf('[CQ:');
            if (startIdx === -1) {
                if (remaining.trim()) {
                    segments.push({ type: 'text', data: { text: remaining.trim() } });
                }
                break;
            }

            if (startIdx > 0) {
                var before = remaining.substring(0, startIdx).trim();
                if (before) segments.push({ type: 'text', data: { text: before } });
            }

            var endIdx = remaining.indexOf(']', startIdx);
            if (endIdx === -1) {
                if (remaining.trim()) segments.push({ type: 'text', data: { text: remaining.trim() } });
                break;
            }

            var cqFull = remaining.substring(startIdx + 4, endIdx);
            var firstComma = cqFull.indexOf(',');
            var cqType = firstComma === -1 ? cqFull : cqFull.substring(0, firstComma);
            var paramStr = firstComma === -1 ? '' : cqFull.substring(firstComma + 1);

            if (cqType === 'contact') {
                segments.push({
                    type: 'contact',
                    data: { type: 'group', id: '491515206' }
                });
            } else if (cqType === 'image') {
                var filePrefix = 'file=';
                var fileIdx = paramStr.indexOf(filePrefix);
                if (fileIdx !== -1) {
                    var fileValue = paramStr.substring(fileIdx + filePrefix.length);
                    var nextParam = fileValue.search(/,[a-zA-Z_]+=/);
                    if (nextParam > 0) fileValue = fileValue.substring(0, nextParam);
                    segments.push({ type: 'image', data: { file: fileValue } });
                }
            } else {
                segments.push({ type: 'text', data: { text: '[CQ:' + cqFull + ']' } });
            }

            remaining = remaining.substring(endIdx + 1);
        }
        return segments;
    }

    function makeNode(userId, nickname, contentSegments) {
        return {
            type: 'node',
            data: {
                user_id: String(userId),
                nickname: String(nickname),
                content: contentSegments
            }
        };
    }

    function napCatPost(apiPath, payload, ctx, msg) {
        var baseUrl = seal.ext.getStringConfig(ext, 'napcat_http_url').replace(/\/+$/, '');
        var token = seal.ext.getStringConfig(ext, 'napcat_token');
        var url = baseUrl + apiPath;
        if (token) url += '?access_token=' + encodeURIComponent(token);

        var headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        }).then(function (resp) {
            if (!resp.ok) {
                seal.replyToSender(ctx, msg, '⚠ 合并转发发送失败：HTTP ' + resp.status);
                return;
            }
            return resp.json();
        }).then(function (json) {
            if (json && json.retcode !== 0) {
                seal.replyToSender(ctx, msg, '⚠ 合并转发发送失败：' + (json.message || json.msg || JSON.stringify(json)));
            }
        }).catch(function (e) {
            seal.replyToSender(ctx, msg, '⚠ 合并转发发送失败：' + String(e));
        });
    }

    // ====================== 监听 .help 指令（严格无参数） ======================
    ext.onCommandReceived = function (ctx, msg, cmdArgs) {
        // 只处理指令名为 help 的情况
        if (cmdArgs.command !== 'help') {
            return;
        }

        // 关键判断：只有没有任何参数时才触发（即纯 .help）
        // cmdArgs.args 是参数数组，如果长度为 0 或所有参数都是空，则视为纯 .help
        const args = cmdArgs.args || [];
        const hasParams = args.some(arg => String(arg).trim() !== '');

        if (hasParams) {
            return;   // 有参数（如 .help 娱乐）则不触发
        }

        // ==================== 你的私设内容 ====================
        var rawContent = `属于是完完全全可以看得出来的私设里，喜欢了太久剧情却越来越少难免添加一些自己的理解，能接受就继续使用吧，不接受也别骂设定，更别骂里。
我会不时巡视账号，如果刚好有人在进行任何对里的侮辱性言论算你倒霉，恭喜喜提永久黑名单，被抓到的举报行为同理。刷屏，集骰，拉进非骰点需求群，禁言到用户群-群文件-解除黑名单收集表，填表留档，再犯一直封着吧。
——
[CQ:contact,type=group,id=491515206]
——
附加功能：
1.牌堆[.draw list]，回复词[reply]，单人模组[kpless]，插件列表[extension]
2.包含log计时功能，[.log new]新建计时，[.log off]暂停计时，[.log]查看当前计时，[.log end]结束并删除计时。
3.[.team]。海豹不包含team功能，遂使用插件完成等效替代。
4.BV号解析，直接发送视频的[bv号]即可获取对应封面及链接。
5.kp群汇总，用于查询kp群号的插件，发送[.kp]查看详情，其中使用[.kp<群号>]可进行反向查询。
6.http cats，网页报错猫版图片，发送[.http 状态码（如101/102/...）]即可获得对应图片。
——
当前支持规则：
1.COC，DND指令去看手册：https://docs.sealdice.com/use/quick-start.html
2.绿色三角洲、黑暗世界、暗影狂奔、WoD、双十字和共鸣性怪异规则：https://docs.sealdice.com/use/other_rules.html
3. 最终物语：发送[.fu]查看具体指令内容。
4. 喵苏鲁：发送[.喵]查看具体指令内容。
5. 餐云卧石：发送[.cyws]查看具体指令内容，作者言“只有卡模版，检定用coc7（主要是观察了一番coc房规就能满足检定）”。
6. 忍神：发送[.rs]查看详情。
7. BRP：包含[.brp]和[.brpv]指令，发送[.set brp]或[.set BRP]切换至此规则。
——
规则辅助功能：
□使用牌堆（.draw xxx）功能实现：
1. PC弱点表：pc弱点（不是单纯的“弱点”，而是能够积极行动的“弱点”。作者twi@worey10，翻嵌Sin（oymips）。）
2. COC：调查员｜幼年调查员｜COC职业｜煤气灯｜克苏鲁神话｜击中部位｜即时症状｜总结症状｜导入
3. DND：构成角色｜九宫格阵营｜关键NPC｜生成魔鬼｜生成恶魔｜万象无常｜狂野魔法浪涌｜魔豆之袋｜杂货法袍｜dnd随机神器｜随机冒险
4. 双人搜查：异常癖好｜事从口出表｜强制搜查表｜假装糊涂表｜沉迷事件表｜和搭档...表｜在做什么表｜紧急灵感表｜喜怒哀乐表｜异想天开表｜侦探类型｜助手类型｜命运血统背景表｜天性才能背景表｜狂人背景表｜正义之人背景表｜热情之人背景表｜被卷入之人背景表｜客座关系表｜据点表｜感情表A｜感情表B
5. 喵苏鲁：coc喵生成
□使用插件功能实现：
6. DND5e施法辅助：自动施法，发送[.cs help]查看详情。
7. DND随机法术：抽取对应环数DND法术，发送[.随机法术 环数（0-9）]查看详情（环数可以不止一个，比如说“.随机法术 0123456”）。
8. Enhanced DnD：一个 DND5e 的额外功能插件，提供物品栏，商店，拓展长休，短休等功能，使用[.ext enhanced-dnd]来查看可用指令
9. 忍神速查：基于忍神自动卡的忍神速查，发送[.忍神速查]查看详情。`;

        var botQQ = extractQQ(ctx.endPoint.userId);
        var botName = ctx.endPoint.nickname || 'SealDice';

        var segments = parseContent(rawContent);
        var nodes = [];

        for (var i = 0; i < segments.length; i++) {
            var msgSegments = buildMessageSegments(segments[i]);
            if (msgSegments.length > 0) {
                nodes.push(makeNode(botQQ, botName, msgSegments));
            }
        }

        if (nodes.length === 0) return;

        var isGroup = (msg.messageType === 'group');
        if (isGroup) {
            var groupId = extractQQ(ctx.group.groupId);
            napCatPost('/send_group_forward_msg', {
                group_id: groupId,
                messages: nodes
            }, ctx, msg);
        } else {
            var userId = extractQQ(ctx.player.userId);
            napCatPost('/send_private_forward_msg', {
                user_id: userId,
                messages: nodes
            }, ctx, msg);
        }
    };
}
