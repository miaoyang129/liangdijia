/* 只替换引号里的两项。它们是公开连接信息，不是密码。
   只使用 sb_publishable_ 开头的 Publishable key。
   严禁填写数据库密码、个人密码、sb_secret_ 或 service_role 密钥。 */
window.LDJ_CONFIG = Object.freeze({
  supabaseUrl: "https://epydehdsqskdqhwijpzq.supabase.co",
  supabasePublishableKey: "sb_publishable_aCgdDYwIyNP4fumZkeX2Rg_MI_aMv-d"
});
