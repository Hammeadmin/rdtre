import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'
import { PDFDocument, rgb, StandardFonts, PageSizes } from 'https://esm.sh/pdf-lib@1.17.1'

// --- Dropbox Sign (HelloSign) API Integration ---
async function sendContractWithDropboxSign(pdfBytes: Uint8Array, contractDetails: any, employerProfile: any) {
  const apiKey = Deno.env.get('DROPBOX_SIGN_API_KEY');
  if (!apiKey) {
    throw new Error("Dropbox Sign API key not configured in environment variables.");
  }

  const authHeader = 'Basic ' + btoa(`${apiKey}:`);
  const formData = new FormData();
  formData.append('file[0]', new Blob([pdfBytes], { type: 'application/pdf' }), contractDetails.document_name + '.pdf');

  const requestData = {
    title: contractDetails.document_name,
    subject: `Signeringsförfrågan: ${contractDetails.document_name}`,
    message: `Vänligen granska och signera följande dokument: ${contractDetails.document_name}.`,
    signers: [
      {
        email_address: employerProfile.pharmacy_contact_email || employerProfile.email,
        name: employerProfile.full_name || employerProfile.pharmacy_name,
        order: 0,
      },
      {
        email_address: contractDetails.employee_email,
        name: contractDetails.employee_name,
        order: 1,
      }
    ],
    test_mode: 1,
  };
  formData.append('signature_request', JSON.stringify(requestData));

  const response = await fetch('https://api.hellosign.com/v3/signature_request/send', {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Dropbox Sign Error Response:", data);
    throw new Error(`Dropbox Sign Error: ${data.error?.error_msg || 'Failed to send signature request.'}`);
  }

  return { id: data.signature_request.signature_request_id };
}

// --- NEW ENHANCED PDF GENERATION LOGIC ---
async function createEnhancedPdf(profile: any, dynamic_data: any, template_id: string): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = page.getSize();

    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const black = rgb(0, 0, 0);
    const gray = rgb(0.3, 0.3, 0.3);

    let y = height - 60;
    const leftMargin = 60;
    const contentWidth = width - (leftMargin * 2);
    
    const drawText = (text: string, options: { font?: any, size?: number, color?: any, x?: number, y?: number, maxWidth?: number, lineHeight?: number } = {}) => {
        const lineHeight = options.lineHeight || 14;
        const size = options.size || 10;
        // Check if there is enough space for at least one line
        if (y < size + 60) {
            page = pdfDoc.addPage(PageSizes.A4);
            y = height - 60;
        }
        page.drawText(text, {
            x: options.x || leftMargin,
            y: y,
            font: options.font || helveticaFont,
            size: size,
            color: options.color || gray,
            maxWidth: options.maxWidth || contentWidth,
            lineHeight: lineHeight,
        });
        
        // Simple line break calculation (can be improved for more accuracy)
        const font = options.font || helveticaFont;
        const textWidth = font.widthOfTextAtSize(text, size);
        const lines = Math.ceil(textWidth / (options.maxWidth || contentWidth));
        y -= (lines * lineHeight);
    };

    const drawSectionHeader = (text: string) => {
        y -= 20; // Space before header
        drawText(text, { font: helveticaBoldFont, size: 12, color: black });
        y -= 5; // Space after header
    };

    // --- Header and Parties ---
    if (profile.company_logo_url) {
        try {
            const logoBytes = await fetch(profile.company_logo_url).then(res => res.arrayBuffer());
            const logoImage = profile.company_logo_url.endsWith('.png') ? await pdfDoc.embedPng(logoBytes) : await pdfDoc.embedJpg(logoBytes);
            const logoDims = logoImage.scale(0.15); // Slightly smaller logo
            page.drawImage(logoImage, {
                x: width - logoDims.width - leftMargin,
                y: y - logoDims.height + 20,
                width: logoDims.width,
                height: logoDims.height,
            });
        } catch (e) { console.error("Could not embed logo:", e); }
    }

    const isCompanyConsultant = template_id === 'builtin_consultant_company';
    const isConsultantEmployee = template_id === 'builtin_consultant_employee';
    
    let title = 'ANSTÄLLNINGSAVTAL – TIMANSTÄLLNING';
    if (isCompanyConsultant) title = 'KONSULTAVTAL - FÖRETAG';
    if (isConsultantEmployee) title = 'ANSTÄLLNINGSAVTAL – KONSULT (VISSTID)';
    drawText(title, { font: helveticaBoldFont, size: 16, color: black });
    y -= 15;
    drawText(`Detta avtal har upprättats ${new Date().toLocaleDateString('sv-SE')} mellan:`, { size: 10 });
    y -= 30;

    const employerTitle = isConsultant ? 'Uppdragsgivare' : 'Arbetsgivare';
    const employeeTitle = isConsultant ? 'Konsult' : 'Arbetstagare';
    
    const fullAddress = [profile.street_address, profile.postal_code, profile.city].filter(Boolean).join(', ');
    drawText(employerTitle, { font: helveticaBoldFont, size: 11 });
    y -= 5;
    drawText(`${profile.pharmacy_name || '[Företagsnamn]'}`, {});
    drawText(`Org.nr: ${profile.organization_number || '[Org.nr saknas]'}`, {});
    drawText(`Adress: ${fullAddress || '[Adress saknas]'}`, {});
    y -= 20;

    drawText(employeeTitle, { font: helveticaBoldFont, size: 11 });
    y -= 5;
    drawText(`${dynamic_data.employee_name || '[Namn]'}`, {});
    drawText(`Personnr: ${dynamic_data.employee_ssn || '[Personnummer]'}`, {});
    drawText(`Adress: ${dynamic_data.employee_address || '[Adress]'}`, {});
    drawText(`E-post: ${dynamic_data.employee_email}`, {});
    y -= 20;
    
    // --- Specific Clauses based on Contract Type ---
    if (isCompanyConsultant) {
    // --- B2B CONSULTANT (F-SKATT) CLAUSES ---
    drawSectionHeader("1. Uppdragets Omfattning");
    drawText(`Konsulten åtar sig att på uppdrag av Uppdragsgivaren utföra följande tjänster: ${dynamic_data.work_duties || '[Beskrivning av uppdraget]'}. Uppdraget ska utföras fackmannamässigt och i enlighet med Uppdragsgivarens instruktioner.`);

    drawSectionHeader("2. Tidsperiod och Uppsägning");
    let periodTextConsultant = `Detta avtal gäller från och med ${dynamic_data.start_date || '[Startdatum]'}`;
    if (dynamic_data.end_date) {
        periodTextConsultant += ` till och med ${dynamic_data.end_date} och upphör då utan föregående uppsägning.`;
    } else {
        periodTextConsultant += ` och tills vidare. Avtalet kan sägas upp av endera parten med iakttagande av en ömsesidig uppsägningstid om trettio (30) dagar.`;
    }
    drawText(periodTextConsultant, {});

    drawSectionHeader("3. Arvode och Betalningsvillkor");
    drawText(`För utfört arbete utgår ett arvode om ${dynamic_data.salary_hourly || '[Arvode]'} SEK per timme, exklusive mervärdesskatt (moms). Konsulten är ansvarig för att inneha F-skattsedel. Fakturering sker månadsvis i efterskott med 30 dagars betalningsvillkor.`);

    drawSectionHeader("4. Ansvar och Försäkring");
    drawText(`Konsulten är en självständig näringsidkare och ansvarar själv för skatter, sociala avgifter och erforderliga försäkringar, inklusive en ansvarsförsäkring som täcker eventuella skador som kan uppstå under uppdragets utförande. Uppdragsgivarens ansvar är begränsat till det avtalade arvodet.`);

    drawSectionHeader("5. Immateriella Rättigheter");
    drawText(`Alla immateriella rättigheter till det material och resultat som framtas av Konsulten inom ramen för detta uppdrag överlåts till Uppdragsgivaren vid full betalning av arvodet.`);

} else { // --- EMPLOYMENT CONTRACT CLAUSES (for both Timanställning and Konsult-Visstidsanställning) ---
    drawSectionHeader("1. Anställning och Befattning");
    drawText(`Härmed anställs Arbetstagaren som ${dynamic_data.job_title || '[Befattning]'} hos Arbetsgivaren.`);

    drawSectionHeader("2. Anställningsform och Tillträde");
    const employmentType = isConsultantEmployee ? "särskild visstidsanställning som konsult" : "allmän visstidsanställning (s.k. timanställning)";
    let periodTextEmployee = `Anställningen är en ${employmentType} och påbörjas ${dynamic_data.start_date || '[Startdatum]'}.`;
    if (dynamic_data.end_date) {
        periodTextEmployee += ` Anställningen är tidsbegränsad och upphör utan föregående uppsägning den ${dynamic_data.end_date}.`;
    } else {
        periodTextEmployee += ` Anställningen gäller tills vidare, så länge behov av arbetskraft föreligger.`;
    }
    drawText(periodTextEmployee, {});

    drawSectionHeader("3. Arbetsuppgifter och Arbetsplats");
    drawText(`Arbetsuppgifterna består huvudsakligen av: ${dynamic_data.work_duties || '[Beskrivning av arbetsuppgifter]'}. Arbetsplats är normalt vid ${fullAddress || '[Adress]'}, men arbete på annan ort kan förekomma.`);

    drawSectionHeader("4. Lön och Utbetalning");
    drawText(`Lönen utgår med ${dynamic_data.salary_hourly || '[Lön]'} SEK per timme, inklusive semesterersättning enligt lag. Lönen utbetalas månadsvis i efterskott den 25:e varje månad.`);

    drawSectionHeader("5. Sjukdom");
    drawText(`Vid sjukdom ska Arbetstagaren anmäla detta till närmaste chef snarast möjligt. Sjuklön utgår i enlighet med sjuklönelagen (1991:1047).`);

    drawSectionHeader("6. Uppsägning");
    drawText(`För anställningen gäller en ömsesidig uppsägningstid om fjorton (14) dagar, i enlighet med Lagen om anställningsskydd (LAS). Uppsägning ska vara skriftlig.`);

    drawSectionHeader("7. Kollektivavtal");
    drawText(`Arbetsgivaren är eventuellt bunden av kollektivavtal som kan påverka anställningsvillkoren. Information om detta tillhandahålls på begäran.`);
}

    // --- Common Clauses ---
    drawSectionHeader("8. Sekretess");
    drawText(`Parten förbinder sig att under avtalstiden och efter dess upphörande inte för tredje man avslöja konfidentiell information rörande den andra partens verksamhet.`);

    drawSectionHeader("9. Tvist");
    drawText(`Tvist angående tolkning eller tillämpning av detta avtal ska i första hand lösas genom förhandling mellan parterna. Om enighet inte kan uppnås ska tvisten avgöras av allmän domstol med Stockholms tingsrätt som första instans.`);

    // --- Signature Block ---
    y -= 50;
    const signatureLine = "________________________________________";
    const signatureY = y < 150 ? (page = pdfDoc.addPage(PageSizes.A4), height - 150) : y;
    
    page.drawText(signatureLine, { x: leftMargin, y: signatureY, font: helveticaFont, size: 12, color: black });
    page.drawText(signatureLine, { x: width - leftMargin - 220, y: signatureY, font: helveticaFont, size: 12, color: black });
    
    page.drawText("Ort och datum", { x: leftMargin, y: signatureY - 15, font: helveticaFont, size: 9, color: gray });
    page.drawText("Ort och datum", { x: width - leftMargin - 220, y: signatureY - 15, font: helveticaFont, size: 9, color: gray });
    
    page.drawText(profile.pharmacy_name || '[Företagsnamn]', { x: leftMargin, y: signatureY - 40, font: helveticaBoldFont, size: 10, color: black });
    page.drawText(dynamic_data.employee_name || '[Namn]', { x: width - leftMargin - 220, y: signatureY - 40, font: helveticaBoldFont, size: 10, color: black });

    return await pdfDoc.save();
}

// --- The rest of your function (CORS, slugify, Deno.serve) remains unchanged ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function slugify(text: string): string {
  return text.toString().toLowerCase().trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^\w-]+/g, '')
    .replace(/__/g, '_');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { employee_email, template_id, dynamic_data, action } = await req.json();

    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not found.");

    const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profileError) throw new Error("Could not fetch employer profile.");

    let documentName = '';
    let storagePath = '';
    let pdfBytes: Uint8Array;

    if (template_id.startsWith('builtin_')) {
        if (template_id === 'builtin_hourly') {
              documentName = 'Anställningsavtal Timlön';
          } else if (template_id === 'builtin_consultant_employee') {
              documentName = 'Konsult - Visstidsanställning';
          } else {
              documentName = 'Konsultavtal - Företag';
          }
        pdfBytes = await createEnhancedPdf(profile, { ...dynamic_data, employee_email }, template_id);
    } else {
        const { data: template, error: templateError } = await supabase
            .from('contract_templates')
            .select('storage_path, template_name')
            .eq('id', template_id)
            .eq('employer_id', user.id)
            .single();

        if (templateError || !template) throw new Error("Custom template not found or access denied.");
        
        documentName = template.template_name;
        storagePath = template.storage_path;
        
        const { data: fileData, error: downloadError } = await supabase.storage.from('documents').download(storagePath);
        if (downloadError) throw new Error(`Failed to download template: ${downloadError.message}`);
        pdfBytes = new Uint8Array(await fileData.arrayBuffer());
    }

    if (action === 'preview') {
      const previewPath = `contract_previews/${user.id}/${Date.now()}_${slugify(documentName)}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(previewPath, pdfBytes, { contentType: 'application/pdf', upsert: true });

      if (uploadError) throw new Error(`Preview PDF upload failed: ${uploadError.message}`);
      
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(previewPath, 600); // 10 minute expiry

      if (urlError) throw new Error(`Could not create signed URL for preview: ${urlError.message}`);

      return new Response(JSON.stringify({ previewUrl: signedUrlData.signedUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});

    } else if (action === 'send') {
        const safeDocumentName = slugify(documentName);
        storagePath = `generated_contracts/${user.id}/${Date.now()}_${safeDocumentName}.pdf`;
        
        const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true });

        if (uploadError) throw new Error(`Generated PDF upload failed: ${uploadError.message}`);
        
        const { data: contractData, error: insertError } = await supabase
            .from('contracts')
            .insert({
                employer_id: user.id,
                employee_email,
                document_name: documentName,
                document_storage_path: storagePath,
                status: 'draft',
            }).select().single();
          
        if (insertError) throw new Error(`Failed to save contract record: ${insertError.message}`);

        const signingProviderResponse = await sendContractWithDropboxSign(pdfBytes, {
          document_name: documentName,
          employee_email: employee_email,
          employee_name: dynamic_data.employee_name
        }, profile);

        await supabase.from('contracts').update({
            signing_request_id: signingProviderResponse.id,
            status: 'sent',
        }).eq('id', contractData.id);

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    } else {
        throw new Error("Invalid action specified.");
    }
  } catch (error) {
    console.error("Error in generate-and-send-contract:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

