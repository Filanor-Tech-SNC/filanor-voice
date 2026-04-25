---
name: twilio-number
description: Acheter, configurer ou libérer un numéro de téléphone suisse Twilio pour un tenant. Utilise ce skill dès qu'un nouveau tenant est onboardé et a besoin de son numéro +41 dédié. Les numéros sont toujours loués sur le compte Twilio Filanor Tech SNC (KYC fait une fois avec l'extrait RC Vaud). Jamais acheter un numéro au nom du client lui-même.
---

# SKILL — twilio-number

## Quand utiliser

- Acheter un numéro +41 pour un nouveau tenant
- Libérer un numéro quand un tenant résilie (ne pas oublier, ça coûte 1 CHF/mois)
- Changer le numéro d'un tenant (rare, mais possible)
- Configurer le webhook inbound Twilio → Retell

## KYC préalable (fait une fois)

Filanor Tech SNC a fait son KYC Twilio avec :
- Extrait du Registre du Commerce Vaud
- UID suisse (CHE-xxx.xxx.xxx)
- Adresse Chavornay (VD)

Ce bundle est réutilisable pour **tous les numéros +41** (local, mobile, toll-free).
ID du bundle validé : voir `.env.local` (`TWILIO_REGULATORY_BUNDLE_SID`).

Si un jour le bundle expire ou doit être mis à jour, voir `docs/COMPLIANCE_LPD.md` §KYC Twilio.

## Achat d'un numéro

### Choisir le canton du numéro

Le numéro doit correspondre à la zone géographique du client pour la crédibilité :

| Canton | Prefix | Exemple |
|--------|--------|---------|
| Vaud (Lausanne, Nyon, Vevey) | +4121 | +4121519xxxx |
| Genève | +4122 | +4122591xxxx |
| Neuchâtel | +4132 | +4132519xxxx |
| Fribourg | +4126 | +4126591xxxx |
| Valais | +4127 | +4127519xxxx |
| Jura | +4132 | partagé avec NE |

### API Twilio : chercher et acheter

```typescript
import Twilio from 'twilio';
const client = Twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

// 1. Chercher un numéro disponible
const available = await client.availablePhoneNumbers('CH').local.list({
  areaCode: 21,  // Lausanne
  smsEnabled: true,
  voiceEnabled: true,
  limit: 5
});

// 2. Acheter un numéro
const purchased = await client.incomingPhoneNumbers.create({
  phoneNumber: available[0].phoneNumber,
  bundleSid: env.TWILIO_REGULATORY_BUNDLE_SID,
  addressSid: env.TWILIO_ADDRESS_SID,

  // Voice config — route vers Retell
  voiceUrl: `https://app.filanor.ch/api/twilio/voice?tenant_slug=${tenant.slug}`,
  voiceMethod: 'POST',

  // SMS config — route vers notre handler Next.js
  smsUrl: `https://app.filanor.ch/api/twilio/sms`,
  smsMethod: 'POST'
});

// 3. Log en Supabase
await supabase.from('phone_numbers').insert({
  tenant_id: tenant.id,
  phone_number: purchased.phoneNumber,
  twilio_sid: purchased.sid,
  retell_agent_id: tenant.sector === 'salon' ? env.RETELL_AGENT_ID_SALON : env.RETELL_AGENT_ID_RESTAURANT
});
```

### Route Twilio Voice → Retell

L'endpoint `/api/twilio/voice` retourne du TwiML qui connecte l'appel à Retell :

```typescript
// apps/web/app/api/twilio/voice/route.ts
export async function POST(req: Request) {
  const form = await req.formData();
  const calledNumber = form.get('To') as string;
  const fromNumber = form.get('From') as string;

  // Récupère l'agent_id depuis Supabase
  const { data: phone } = await supabase
    .from('phone_numbers')
    .select('retell_agent_id, tenant:tenants(*)')
    .eq('phone_number', calledNumber)
    .single();

  // Génère un Retell call_id via API
  const retellCall = await retellClient.calls.create({
    agent_id: phone.retell_agent_id,
    from_number: fromNumber,
    to_number: calledNumber,
    override_agent_name: phone.tenant.agent_persona
  });

  // Retourne TwiML qui bridge vers Retell
  return new Response(`
    <Response>
      <Connect>
        <Stream url="wss://api.retellai.com/v1/call/${retellCall.call_id}/stream"/>
      </Connect>
    </Response>
  `, { headers: { 'Content-Type': 'text/xml' } });
}
```

⚠️ Note : la méthode exacte d'intégration Twilio-Retell évolue. **Toujours vérifier la doc Retell du jour** : https://docs.retellai.com/deployment/twilio

## Libérer un numéro (résiliation tenant)

```typescript
// 1. Release côté Twilio
await client.incomingPhoneNumbers(twilio_sid).remove();

// 2. Nettoie Supabase
await supabase.from('phone_numbers').delete().eq('twilio_sid', twilio_sid);
await supabase.from('tenants').update({ status: 'archived' }).eq('id', tenant_id);
```

⚠️ Une fois libéré, le numéro peut être repris par un autre client Twilio après 90 jours.
Si le tenant revient après résiliation, on doit racheter un **nouveau** numéro.

## Coûts à surveiller

- Numéro local +41 : ~1 CHF/mois
- Numéro toll-free +41800 : ~2 CHF/mois + surcoût minute
- Minute inbound : ~0.02 CHF
- SMS sortant Suisse : ~0.05 CHF

Facturation Twilio : débitée en $ sur CB, converti en CHF dans la compta Filanor.

## Pièges connus

- **Régulation numéro local = adresse dans le canton** : Filanor est à Chavornay (VD), ça couvre +4121. Pour GE/NE/VS, l'adresse VD peut être refusée — utiliser un numéro mobile +417 si besoin (pas de restriction géographique)
- **Retell restrictions Twilio** : cf. ANTI_PATTERNS.md, utiliser fallback manuel si blocage
- **Don't forget to release** : un numéro oublié coûte 12 CHF/an pour rien
