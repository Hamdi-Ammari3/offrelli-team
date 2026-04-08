"use client";
import { useEffect,useState,useRef } from "react";
import { ClipLoader } from "react-spinners";
import { QRCodeCanvas } from "qrcode.react";
import { DB } from '../firebaseConfig';
import {collection,setDoc,getDocs,getDoc,doc,serverTimestamp} from "firebase/firestore";
import dayjs from "dayjs";
import "dayjs/locale/ar";
import "./style.css";

export default function TeamDashboard() {
  const [loadingStores, setLoadingStores] = useState(false);
  const [activeTab, setActiveTab] = useState("add");
  const [stores, setStores] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cardsNumber, setCardsNumber] = useState("");
  const [storeSearch, setStoreSearch] = useState("");
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);

  dayjs.locale("ar");

  //Fetch stores
  useEffect(() => {
    const fetchStores = async () => {
      setLoadingStores(true);
      const snapshot = await getDocs(collection(DB, "stores"));
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log(data)
      setStores(data);
      setLoadingStores(false);
    };

    fetchStores();
  }, []);

  //Validate phone number
  const validateTunisianPhone = (phone) => {
    const cleanPhone = phone.trim();

    // Must be exactly 8 digits
    const regex = /^[2-9]\d{7}$/;

    return regex.test(cleanPhone);
  };

  //Create new store
  const handleCreate = async () => {
    if (!name || !phone || !cardsNumber) {
      alert("يرجى ملء جميع الحقول");
      return;
    }

    if (!validateTunisianPhone(phone)) {
      alert("رقم الهاتف غير صالح (يجب أن يكون 8 أرقام)");
      return;
    }

    try {
      setLoadingSubmit(true);

      const storeRef = doc(DB, "stores", phone);
      const existingStore = await getDoc(storeRef);

      if (existingStore.exists()) {
        alert("هذا الرقم مسجل بالفعل");
        setLoadingSubmit(false);
        return;
      }

      const generatedPassword = Math.floor(100000 + Math.random() * 900000).toString();
      const orderedCards = Number(cardsNumber);
      const bonusCards = 10;

      const storeData = {
        name,
        phone,
        username: phone,
        password: generatedPassword, 
        cards_limit: Number(orderedCards + bonusCards),
        codes_generated: 0,
        created_at: serverTimestamp(),
        account_banned:false,
      };

      //await addDoc(collection(DB, "stores"), storeData);
      await setDoc(storeRef, storeData);

      // Refresh stores
      const snapshot = await getDocs(collection(DB, "stores"));
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setStores(data);

      // Reset form
      setName("");
      setPhone("");
      setCardsNumber("");

      alert("تم إنشاء المحل بنجاح");

    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء إنشاء المحل");
    } finally {
      setLoadingSubmit(false)
    }
  };

  //Qr code generate
  const qrRef = useRef(null);
  const baseUrl = 'https://offrelli.com';

  const handleDownloadQR = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;

    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `offrini-${selectedStore?.name}.png`;
    a.click();
  };

  //Statistics
  const totalStores = stores.length;
  const totalCards = stores.reduce((sum, s) => sum + (s.cards_limit || 0), 0);

  return (
    <div className="dashboard">
      <header className="header">
        <h1>Offrelli</h1>
      </header>

      <main className="container">
        <div className="tabs">
          <button
            className={activeTab === "add" ? "tab active" : "tab"}
            onClick={() => setActiveTab("add")}
          >
            إضافة محل
          </button>

          <button
            className={activeTab === "list" ? "tab active" : "tab"}
            onClick={() => setActiveTab("list")}
          >
            قائمة المحلات
          </button>

          <button
            className={activeTab === "stats" ? "tab active" : "tab"}
            onClick={() => setActiveTab("stats")}
          >
            الإحصائيات
          </button>
        </div>

        {activeTab === "add" && (
          <section className="card">
            <h2>إضافة محل جديد</h2>

            <div className="form-grid">
              <div>
                <label>اسم المحل</label>
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div>
                <label>رقم الهاتف</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>

              <div>
                <label>عدد البطاقات</label>
                <select
                  value={cardsNumber}
                  onChange={(e) => setCardsNumber(e.target.value)}
                >
                  <option value="">اختر العدد</option>
                  {[100,200,300,400,500,600,700,800,900,1000].map(num => (
                    <option key={num} value={num}>
                      {num} بطاقة
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="primary-btn-container">
              <button
                className="primary-btn"
                onClick={handleCreate}
                disabled={loadingSubmit}
              >
                {loadingSubmit ? (
                  <ClipLoader size={18} color="#ffffff" />
                ) : (
                  "إنشاء المحل"
                )}
              </button>
            </div>
          </section>
        )}

        {activeTab === "list" && (
          <section className="card">
            <div className="store-list-header">
              <h2>قائمة المحلات</h2>
              <input
                className="search-input"
                placeholder="بحث..."
                value={storeSearch}
                onChange={(e) => setStoreSearch(e.target.value)}
              />
            </div>
            <div className="store-list">

              {/* Desktop Table */}
              <div className="table-wrapper desktop-only">
                <table>
                  <thead>
                    <tr>
                      <th>الاسم</th>
                      <th>الهاتف</th>
                      <th>البطاقات الجملية</th>
                      <th>البطاقات المستعملة</th>
                      <th>كلمة المرور</th>
                      <th>QR Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stores.map((store) => (
                      <tr key={store.id}>
                        <td>{store.name}</td>
                        <td>{store.phone}</td>
                        <td>{store.cards_limit}</td>
                        <td>{store.codes_generated}</td>
                        <td>{store.password}</td>
                        <td>
                          <button
                            className="qr-btn"
                            onClick={() => setSelectedStore(store)}
                          >
                            📱
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="mobile-only">
                {stores.map((store) => (
                  <div key={store.id} className="store-card">
                    <div className="store-row">
                      <strong>{store.name}</strong>
                      <span>الاسم</span>
                    </div>

                    <div className="store-row">
                      <strong>{store.phone}</strong>
                      <span>الهاتف</span>
                    </div>

                    <div className="store-row">
                      <strong>{store.cards_limit}</strong>
                      <span>البطاقات الجملية</span>               
                    </div>

                    <div className="store-row">
                      <strong>{store.codes_generated}</strong>
                      <span>البطاقات المستعملة</span>               
                    </div>

                    <div className="store-row">                    
                      <strong>{store.password}</strong>
                      <span>كلمة المرور</span>
                    </div>

                    <div className="store-row">
                      <button
                        className="qr-btn"
                        onClick={() => setSelectedStore(store)}
                      >
                        📱
                      </button>
                      <span>QR Code</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedStore && (
              <div className="qr-modal-overlay">
                <div className="qr-modal">
                  <h4>{selectedStore.name}</h4>
                  <div ref={qrRef} className="qr-wrapper">
                    <QRCodeCanvas
                      value={`${baseUrl}/s/${selectedStore.id}`}
                      size={220}
                    />
                  </div>
                  <button
                    className="close-btn"
                    onClick={() => setSelectedStore(null)}
                  >
                   إغلاق
                  </button>
                  <button className="primary-btn" onClick={handleDownloadQR}>
                   تحميل QR
                  </button>
                </div>
              </div>
            )}

          </section>
        )}

        {activeTab === "stats" && (
          <section className="card">
            <h2>الإحصائيات</h2>

            <div className="stats-grid">
              <div className="stat-box">
                <h3>{totalStores}</h3>
                <p>إجمالي المحلات</p>
              </div>

              <div className="stat-box">
                <h3>{totalCards}</h3>
                <p>إجمالي البطاقات</p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}