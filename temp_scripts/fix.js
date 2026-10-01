const fs = require('fs');
const path = 'client/src/pages/InquiryForm.jsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /import \{ useNavigate \} from 'react-router-dom';/,
  "import { useNavigate, useSearchParams } from 'react-router-dom';"
);

content = content.replace(
  /const navigate = useNavigate\(\);\r?\n\s*const \{ user \} = useAuthStore\(\);/,
  "const navigate = useNavigate();\n  const [searchParams] = useSearchParams();\n  const cloneId = searchParams.get('cloneId');\n  const { user } = useAuthStore();"
);

const useEffStr =   useEffect(() => {
    if (cloneId) {
      const fetchAndClone = async () => {
        try {
          const res = await api.get(\/inquiries/\\);
          if (res.data) {
            const old = res.data;
            clearDraft();
            setField('parentInquiryId', old._id);
            Object.keys(old.customer || {}).forEach(k => setField(\customer.\\, old.customer[k]));
            Object.keys(old.business || {}).forEach(k => setField(\usiness.\\, old.business[k]));
            setField('products', old.products || []);
            setField('productOther', old.productOther || '');
            Object.keys(old.requirement || {}).forEach(k => setField(\equirement.\\, old.requirement[k]));
            Object.keys(old.commercial || {}).forEach(k => setField(\commercial.\\, old.commercial[k]));
            setField('date', new Date().toISOString().split('T')[0]);
          }
        } catch (err) {
          console.error("Failed to clone inquiry", err);
          initDraft();
        }
      };
      fetchAndClone();
    } else {
      initDraft();
    }
  }, [cloneId]);;

content = content.replace(
  /  useEffect\(\(\) => \{\r?\n\s*initDraft\(\);\r?\n\s*\}, \[\]\);/,
  useEffStr
);

fs.writeFileSync(path, content, 'utf8');
