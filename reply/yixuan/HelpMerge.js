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
        var rawContent = `mas：一个纯文字设（因为没固定形象就干脆不约稿了）的oc公骰，QQ平台需要注意的都放空间里面了，KOOK对机器人管理不严就没做要求。
以及，QQ平台我会不时巡视账号，如果刚好有人在进行任何对骰子的侮辱性言论算你倒霉，恭喜喜提永久黑名单，被抓到的举报行为同理。刷屏，集骰，拉进非骰点需求群，禁言到用户群-群文件-解除黑名单收集表，填表留档，再犯一直封着吧。
——
QQ：1275227542，479582565（备用号）
KOOK：https://www.kookapp.cn/app/oauth2/authorize?id=19242&permissions=604919808&client_id=JaSMa5SlJbQ551qQ&redirect_uri=&scope=bot
——
[CQ:contact,type=group,id=491515206]
——
从下方开始，发送[ ]的内容
>>>附加功能：
1.牌堆[.draw list]，插件列表[.插件]，回复词[reply]，单人模组[kpless]。
2.包含log计时功能，[.log new]新建计时，[.log off]暂停计时，[.log]查看当前计时，[.log end]结束并删除计时。
3.[.team]。创建小队名称并添加人员后可，以单独at小队成员。
4.BV号解析，直接发送视频的[bv号]即可获取对应封面及链接。
5.kp群汇总，用于查询kp群号的插件，发送[.kp]查看详情，其中使用[.kp<群号>]可进行反向查询。
6.http cats，网页报错猫版图片，发送[.http 状态码（如101/102/...）]即可获得对应图片。
——
>>>QQ功能：
1.[.点赞 @某人]，给对方名片点赞。
□群管理命令列表（需管理员权限）：
1.[.设置群名 <名称>]，修改群名称。
2.[.全员禁言 <1/0>]，1开启/0关闭全员禁言。
3.[.群公告发布 <内容>]，发布群公告。
□群主命令列表（需群主权限）：
1.[.设置管理员 <1/0> @某人]，1设置/0取消管理员。
——
>>>当前支持规则：
1.COC，DND指令去看手册：https://docs.sealdice.com/use/quick-start.html
2.绿色三角洲、黑暗世界、暗影狂奔、WoD、双十字和共鸣性怪异规则：https://docs.sealdice.com/use/other_rules.html
其余规则详情发送[.插件 规则]（需要之前发送过一次[.插件]）即可查看。
——
>>>规则辅助功能：
□使用牌堆（.draw xxx）功能实现：
1. PC弱点表：pc弱点（不是单纯的“弱点”，而是能够积极行动的“弱点”。作者twi@worey10，翻嵌Sin（oymips）。）
2. COC：调查员｜幼年调查员｜COC职业｜煤气灯｜克苏鲁神话｜击中部位｜即时症状｜总结症状｜导入
3. DND：构成角色｜九宫格阵营｜关键NPC｜生成魔鬼｜生成恶魔｜万象无常｜狂野魔法浪涌｜魔豆之袋｜杂货法袍｜dnd随机神器｜随机冒险
4.PF1E：战斗考题
5. 喵苏鲁：coc喵生成
□使用插件功能实现：
6. Enhanced DnD：一个 DND5e 的额外功能插件，提供物品栏，商店，拓展长休，短休等功能，使用[.ext enhanced-dnd]来查看可用指令
7. 忍神速查：基于忍神自动卡的忍神速查，发送[.忍神速查]查看详情。`;

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
