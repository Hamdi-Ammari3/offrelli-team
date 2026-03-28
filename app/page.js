"use client";
import { useEffect, useState } from "react";
import { ClipLoader } from "react-spinners";
import { DB } from '../firebaseConfig';
import {collection,setDoc,getDocs,getDoc,doc,Timestamp,serverTimestamp} from "firebase/firestore";
import dayjs from "dayjs";
import "dayjs/locale/ar";
import "./style.css";

export default function TeamDashboard() {
  const [loadingStores, setLoadingStores] = useState(false);
  const [activeTab, setActiveTab] = useState("add");
  const [stores, setStores] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [startSubs, setStartSubs] = useState("");
  const [subsDuration, setSubsDuration] = useState("");
  const [storeSearch, setStoreSearch] = useState("");
  const [loadingSubmit, setLoadingSubmit] = useState(false);

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

  //Create new store
  const handleCreate = async () => {
    if (!name || !phone || !startSubs || !subsDuration) {
      alert("يرجى ملء جميع الحقول");
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

      const startDate = new Date(startSubs);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + Number(subsDuration));

      const generatedPassword = Math.floor(100000 + Math.random() * 900000).toString();

      const storeData = {
        name,
        phone,
        username: phone,
        password: generatedPassword, 
        plan:'pro',
        start_subs: Timestamp.fromDate(startDate),
        end_subs: Timestamp.fromDate(endDate),
        subs_duration: Number(subsDuration),
        created_at: serverTimestamp(),
        account_expired:false,
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
      setStartSubs("");
      setSubsDuration("");

      alert("تم إنشاء المحل بنجاح");

    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء إنشاء المحل");
    } finally {
      setLoadingSubmit(false)
    }
  };

  //Statistics
  const totalStores = stores.length;
  const oneMonth = stores.filter(s => s.subs_duration === 1).length;
  const sixMonths = stores.filter(s => s.subs_duration === 6).length;
  const oneYear = stores.filter(s => s.subs_duration === 12).length;

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
                <label>تاريخ بداية الاشتراك</label>
                <input
                  type="date"
                  value={startSubs}
                  onChange={(e) => setStartSubs(e.target.value)}
                />
              </div>

              <div>
                <label>مدة الاشتراك (بالأشهر)</label>
                <input
                  type="number"
                  value={subsDuration}
                  onChange={(e) => setSubsDuration(e.target.value)}
                />
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
                      <th>المدة</th>
                      <th>نهاية الاشتراك</th>
                      <th>كلمة المرور</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stores.map((store) => (
                      <tr key={store.id}>
                        <td>{store.name}</td>
                        <td>{store.phone}</td>
                        <td>{store.subs_duration} شهر</td>
                        <td>
                          {store.end_subs
                            ? dayjs(store.end_subs.toDate()).format("DD/MM/YYYY")
                            : "-"}
                        </td>
                        <td>{store.password}</td>
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
                      <strong>{store.subs_duration} شهر</strong>
                      <span>المدة</span>                    
                    </div>

                    <div className="store-row">                      
                      <strong>
                        {store.end_subs
                          ? dayjs(store.end_subs.toDate()).format("DD/MM/YYYY")
                          : "-"}
                      </strong>
                      <span>نهاية الاشتراك</span>
                    </div>

                    <div className="store-row">                    
                      <strong>{store.password}</strong>
                      <span>كلمة المرور</span>
                    </div>
                  </div>
                ))}
              </div>

            </div>
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
                <h3>{oneMonth}</h3>
                <p>اشتراك شهر واحد</p>
              </div>

              <div className="stat-box">
                <h3>{sixMonths}</h3>
                <p>اشتراك 6 أشهر</p>
              </div>

              <div className="stat-box">
                <h3>{oneYear}</h3>
                <p>اشتراك سنة</p>
              </div>
            </div>
          </section>
        )}

      </main>
    </div>
  );
}

/*
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>الهاتف</th>
                    <th>المدة</th>
                    <th>نهاية الاشتراك</th>
                    <th>كلمة المرور</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingStores ? (
                    <tr>
                      <td colSpan="5" className="empty">
                        <ClipLoader size={25} color="#000" />
                      </td>
                    </tr>
                  ) : stores.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="empty">
                        لا توجد محلات
                      </td>
                    </tr>
                  ) : (
                    stores.map((store) => (
                      <tr key={store.id}>
                        <td>{store.name}</td>
                        <td>{store.phone}</td>
                        <td>{store.subs_duration} شهر</td>
                        <td>
                          {store.end_subs
                            ? dayjs(store.end_subs.toDate()).format("DD/MM/YYYY")
                            : "-"}
                        </td>
                        <td>{store.password}</td>                      
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
*/

