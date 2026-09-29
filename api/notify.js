module.exports=async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Método não permitido'});
  const{to,subject,html}=req.body||{};
  if(!process.env.RESEND_API_KEY)return res.status(503).json({error:'RESEND_API_KEY não configurada'});
  if(!Array.isArray(to)||!to.length||!subject||!html)return res.status(400).json({error:'Dados incompletos'});
  try{
    const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.NOTIFY_FROM_EMAIL||'US. <onboarding@resend.dev>',to:[...new Set(to)].filter(Boolean),subject,html})});
    const data=await r.json();
    if(!r.ok)return res.status(r.status).json({error:data.message||'Falha no envio'});
    return res.status(200).json({ok:true,id:data.id});
  }catch(e){return res.status(502).json({error:'Não foi possível contactar o provedor de e-mail'})}
}
