'use strict';
/* Persistência remota. A anon key pode ficar no frontend porque o acesso aos
   dados é feito apenas pelas RPCs abaixo, que validam o token da sessão. */
const Sync=(()=>{
  const C=window.US_CONFIG||{},LS='us.link',on=!!(C.url&&C.key&&C.key.indexOf('COLE_')<0),A='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let link=null,t=null;try{link=JSON.parse(localStorage.getItem(LS))}catch(e){}
  const keep=()=>link&&localStorage.setItem(LS,JSON.stringify(link));
  const call=(fn,b)=>fetch(`${C.url}/rest/v1/rpc/${fn}`,{method:'POST',headers:{apikey:C.key,Authorization:'Bearer '+C.key,'Content-Type':'application/json'},body:JSON.stringify(b)})
    .then(r=>{if(!r.ok)throw new Error(`Supabase ${r.status}`);return r.json()});
  const one=r=>Array.isArray(r)?r[0]:r;
  return{on,get link(){return link},norm:s=>String(s).toUpperCase().replace(/[^A-Z0-9]/g,''),show:c=>c.replace(/(.{4})(?=.)/g,'$1-'),
    async create(data){const code=[...crypto.getRandomValues(new Uint8Array(12))].map(x=>A[x%A.length]).join('');const r=one(await call('create_space',{p_code:code,p_data:data}));const x=r?.create_space||r;if(!x||x.ok===false)throw new Error('create failed');link={code,token:x.token,rev:x.rev||1,me:0};keep();return code},
    async find(code){const r=one(await call('find_space',{p_code:code}));return r?.data?r:null},
    async join(code,me){const r=one(await call('join_space',{p_code:code,p_me:me}));const x=r?.join_space||r;if(!x?.token)throw new Error('join failed');link={code,token:x.token,rev:x.rev,me};keep();return x.data},
    async pull(force=false){if(!link?.token)return null;const r=one(await call('get_space',{p_code:link.code,p_token:link.token,p_rev:force?-1:link.rev}));const x=r?.get_space||r;if(!x||!x.data)return null;link.rev=x.rev;keep();return x},
    push(s){if(!link?.token)return;clearTimeout(t);t=setTimeout(async()=>{try{const r=one(await call('save_space',{p_code:link.code,p_token:link.token,p_rev:link.rev,p_data:s}));const x=r?.save_space||r;if(x?.rev)link.rev=x.rev;keep()}catch(e){console.warn('Falha ao sincronizar',e)}},350)},
    leave(){localStorage.removeItem(LS);link=null}
  };
})();
