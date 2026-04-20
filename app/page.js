"use client";
import { useEffect,useState,useRef } from "react";
import { ClipLoader } from "react-spinners";
import { QRCodeCanvas } from "qrcode.react";
import { DB } from '../firebaseConfig';
import {collection,addDoc,getDocs,serverTimestamp} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import dayjs from "dayjs";
import "dayjs/locale/ar";
import "./style.css";

export default function TeamDashboard() {
  const [activeTab, setActiveTab] = useState("add");
  const [stores, setStores] = useState([]);
  const [storeSearch, setStoreSearch] = useState("");
  const [selectedStore, setSelectedStore] = useState(null);

  const daysOfWeek = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

  const [profileName, setProfileName] = useState("");
  const [bio, setBio] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktop, setTiktop] = useState("");
  const [address, setAddress] = useState("");
  const [mapLink, setMapLink] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);

  const [products, setProducts] = useState([
    { name: "", price: 0, image: null }
  ]);
  
  const [workingHours, setWorkingHours] = useState(
    daysOfWeek.map((day) => ({
      day,
      isOpen: true,
      open: "",
      close: "",
    }))
  );

  const [creatingProfileLoading,setCreatingProfileLoading] = useState(false)

  dayjs.locale("ar");

  //Fetch stores
  useEffect(() => {
    const fetchStores = async () => {
      const snapshot = await getDocs(collection(DB, "profiles"));
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setStores(data);
    };

    fetchStores();
  }, []);

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

  
  //Validate phone number
  const validateTunisianPhone = (phone) => {
    const cleanPhone = phone.trim();

    // Must be exactly 8 digits
    const regex = /^[2-9]\d{7}$/;

    return regex.test(cleanPhone);
  };

  //Upload image on firebase storage
  const uploadImage = async (file, path) => {
    const storage = getStorage(); // 🔥 same as your previous project
    const storageRef = ref(storage, path);

    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  //Convert number to map coordinates
  const parseCoordinates = (input) => {
    if (!input) return null;

    const parts = input.split(",");

    if (parts.length !== 2) return null;

    const latitude = parseFloat(parts[0].trim());
    const longitude = parseFloat(parts[1].trim());

    if (isNaN(latitude) || isNaN(longitude)) return null;

    return { latitude, longitude };
  };

  //Convert time to munites
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return null;

    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  //Create store profile
  const handleCreateProfile = async () => {
    try {
      setCreatingProfileLoading(true);

      if (!profileName || !profilePhone || !address) {
        alert("يرجى ملء جميع الحقول");
        return;
      }

      if (!validateTunisianPhone(profilePhone)) {
        alert("رقم الهاتف غير صالح (يجب أن يكون 8 أرقام)");
        return;
      }

      for (let d of workingHours) {
        if (d.isOpen && (!d.open || !d.close)) {
          alert(`حدد التوقيت ليوم ${d.day}`);
          return;
        }
      }

      // Upload images
      const logoUrl = logoFile
        ? await uploadImage(logoFile, `profiles/${Date.now()}_logo`)
        : "";

      const coverUrl = coverFile
        ? await uploadImage(coverFile, `profiles/${Date.now()}_cover`)
        : "";

      // Upload products images
      const formattedProducts = [];
      for (let p of products) {
        let imageUrl = "";
        if (p.image) {
          imageUrl = await uploadImage(p.image, `products/${Date.now()}_${p.name}`);
        }

        formattedProducts.push({
          name: p.name,
          price: Number(p.price) || 0,
          image: imageUrl,
        });
      }

      const locationData = parseCoordinates(mapLink);

      if (mapLink && !locationData) {
        alert("صيغة الموقع غير صحيحة (lat,lng)");
        return;
      }

      const formattedWorkingHours = workingHours.map((d) => ({
        day: d.day,
        isOpen: d.isOpen,
        open: d.isOpen ? timeToMinutes(d.open) : null,
        close: d.isOpen ? timeToMinutes(d.close) : null,
      }));

      // Create profile doc
      const profileData = {
        name: profileName,
        bio,
        phone: profilePhone,
        whatsapp,
        logo: logoUrl,
        cover: coverUrl,
        socials: {facebook,instagram,tiktop},
        address,
        location: locationData || null,
        products: formattedProducts,
        working_hours: formattedWorkingHours,
        created_at: serverTimestamp(),
      };

      await addDoc(collection(DB, "profiles"), profileData);

      alert("تم إنشاء البروفايل بنجاح");

    } catch (err) {
      console.error(err);
      alert("خطأ في إنشاء البروفايل");
    } finally {
      setCreatingProfileLoading(false);
    }
  };

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
            <h2>إضافة بروفايل المحل</h2>
            <div className="profile-form-grid">
              <div className="profile-form-grid-box">
                <label>Logo</label>
                <input type="file" onChange={(e)=>setLogoFile(e.target.files[0])} />
              </div>
              <div className="profile-form-grid-box">
                <label>Cover</label>
                <input type="file" onChange={(e)=>setCoverFile(e.target.files[0])} />
              </div>          
              <input placeholder="اسم المحل" onChange={(e)=>setProfileName(e.target.value)} />
              <input placeholder="Bio" onChange={(e)=>setBio(e.target.value)} />
              <input placeholder="Phone" onChange={(e)=>setProfilePhone(e.target.value)} />
              <input placeholder="WhatsApp" onChange={(e)=>setWhatsapp(e.target.value)} />
              <input placeholder="Facebook link" onChange={(e)=>setFacebook(e.target.value)} />
              <input placeholder="Instagram link" onChange={(e)=>setInstagram(e.target.value)} />
              <input placeholder="Tiktok link" onChange={(e)=>setTiktop(e.target.value)} />
              <input placeholder="Address (optional)" onChange={(e)=>setAddress(e.target.value)} />
              <input placeholder="Map link (optional)" onChange={(e)=>setMapLink(e.target.value)} />
            </div>

            {/* PRODUCTS */}
            <div className="profile-form-grid-box" style={{marginTop:'15px',marginBottom:'15px'}}>
              <h3>Products</h3>
             <button
              onClick={() =>
                setProducts([...products, { name: "", price: 0, image: null }])
              }
            >
              + Add Product
            </button>
            </div>
            
            <div 
              className="profile-form-grid-box"
              style={{flexDirection:'column'}}
            >
            {products.map((p, i) => (
              <div key={i}>
                <input
                  placeholder="Product name"
                  onChange={(e)=>{
                    const newP=[...products];
                    newP[i].name=e.target.value;
                    setProducts(newP);
                  }}
                />
                <input
                  type="number"
                  placeholder="Price"
                  onChange={(e) => {
                    const newP = [...products];
                    newP[i].price = Number(e.target.value); // 🔥 always number
                    setProducts(newP);
                  }}
                />
                <input
                  type="file"
                  onChange={(e)=>{
                    const newP=[...products];
                    newP[i].image=e.target.files[0];
                    setProducts(newP);
                  }}
                />
              </div>
            ))}
            </div>

            <div className="profile-form-grid-box" style={{flexDirection:'row',marginTop:'15px'}}>
            {workingHours.map((dayObj, index) => (
              <div key={index} style={{ marginBottom: "10px" }}>
                <strong>{dayObj.day}</strong>

                {/* RADIO BUTTONS */}
                <div>
                  <label>
                    <input
                      type="radio"
                      checked={dayObj.isOpen}
                      onChange={() => {
                        const newHours = [...workingHours];
                        newHours[index].isOpen = true;
                        setWorkingHours(newHours);
                      }}
                    />
                    Open
                  </label>

                  <label style={{ marginLeft: "10px" }}>
                    <input
                      type="radio"
                      checked={!dayObj.isOpen}
                      onChange={() => {
                        const newHours = [...workingHours];
                        newHours[index].isOpen = false;
                        newHours[index].open = "";
                        newHours[index].close = "";
                        setWorkingHours(newHours);
                      }}
                    />
                    Closed
                  </label>
                </div>

                {/* TIME INPUTS */}
                {dayObj.isOpen && (
                  <div style={{ marginTop: "5px" }}>
                    <input
                      type="time"
                      value={dayObj.open}
                      onChange={(e) => {
                        const newHours = [...workingHours];
                        newHours[index].open = e.target.value;
                        setWorkingHours(newHours);
                      }}
                    />

                    <input
                      type="time"
                      value={dayObj.close}
                      onChange={(e) => {
                        const newHours = [...workingHours];
                        newHours[index].close = e.target.value;
                        setWorkingHours(newHours);
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
            </div>

            <div className="profile-form-grid-box">
              <button
                className="primary-btn"
                onClick={handleCreateProfile}
                disabled={creatingProfileLoading}
              >
                {creatingProfileLoading ? (
                  <ClipLoader size={18} color="#ffffff" />
                ) : (
                  "إنشاء البروفايل"
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
                      <th>QR Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stores.map((store) => (
                      <tr key={store.id}>
                        <td>{store.name}</td>
                        <td>{store.phone}</td>
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
                      value={`${baseUrl}/profiles/${selectedStore.id}`}
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






/*
"use client";
import { useEffect,useState,useRef } from "react";
import { ClipLoader } from "react-spinners";
import { QRCodeCanvas } from "qrcode.react";
import { DB } from '../firebaseConfig';
import {collection,addDoc,setDoc,getDocs,getDoc,doc,serverTimestamp} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
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

  const daysOfWeek = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

  const [profileName, setProfileName] = useState("");
  const [bio, setBio] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktop, setTiktop] = useState("");
  const [address, setAddress] = useState("");
  const [mapLink, setMapLink] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);

  const [products, setProducts] = useState([
    { name: "", price: 0, image: null }
  ]);
  
  const [workingHours, setWorkingHours] = useState(
    daysOfWeek.map((day) => ({
      day,
      isOpen: true,
      open: "",
      close: "",
    }))
  );

  const [creatingProfileLoading,setCreatingProfileLoading] = useState(false)

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

  //Create new store for discount service
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

  //Upload image on firebase storage
  const uploadImage = async (file, path) => {
    const storage = getStorage(); // 🔥 same as your previous project
    const storageRef = ref(storage, path);

    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  //Convert number to map coordinates
  const parseCoordinates = (input) => {
    if (!input) return null;

    const parts = input.split(",");

    if (parts.length !== 2) return null;

    const latitude = parseFloat(parts[0].trim());
    const longitude = parseFloat(parts[1].trim());

    if (isNaN(latitude) || isNaN(longitude)) return null;

    return { latitude, longitude };
  };

  //Convert time to munites
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return null;

    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  //Create store profile
  const handleCreateProfile = async () => {
    try {
      setCreatingProfileLoading(true);

      for (let d of workingHours) {
        if (d.isOpen && (!d.open || !d.close)) {
          alert(`حدد التوقيت ليوم ${d.day}`);
          return;
        }
      }

      // Upload images
      const logoUrl = logoFile
        ? await uploadImage(logoFile, `profiles/${Date.now()}_logo`)
        : "";

      const coverUrl = coverFile
        ? await uploadImage(coverFile, `profiles/${Date.now()}_cover`)
        : "";

      // Upload products images
      const formattedProducts = [];
      for (let p of products) {
        let imageUrl = "";
        if (p.image) {
          imageUrl = await uploadImage(p.image, `products/${Date.now()}_${p.name}`);
        }

        formattedProducts.push({
          name: p.name,
          price: Number(p.price) || 0,
          image: imageUrl,
        });
      }

      const locationData = parseCoordinates(mapLink);

      if (mapLink && !locationData) {
        alert("صيغة الموقع غير صحيحة (lat,lng)");
        return;
      }

      const formattedWorkingHours = workingHours.map((d) => ({
        day: d.day,
        isOpen: d.isOpen,
        open: d.isOpen ? timeToMinutes(d.open) : null,
        close: d.isOpen ? timeToMinutes(d.close) : null,
      }));

      // Create profile doc
      const profileData = {
        name: profileName,
        bio,
        phone: profilePhone,
        whatsapp,
        logo: logoUrl,
        cover: coverUrl,
        socials: {facebook,instagram,tiktop},
        address,
        location: locationData || null,
        products: formattedProducts,
        working_hours: formattedWorkingHours,
        created_at: serverTimestamp(),
      };

      await addDoc(collection(DB, "profiles"), profileData);

      alert("تم إنشاء البروفايل بنجاح");

    } catch (err) {
      console.error(err);
      alert("خطأ في إنشاء البروفايل");
    } finally {
      setCreatingProfileLoading(false);
    }
  };

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
            className={activeTab === "profile" ? "tab active" : "tab"}
            onClick={() => setActiveTab("profile")}
          >
           إضافة بروفايل
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

        {activeTab === "profile" && (
          <section className="card">
            <h2>إضافة بروفايل المحل</h2>
            <div className="profile-form-grid">
              <div className="profile-form-grid-box">
                <label>Logo</label>
                <input type="file" onChange={(e)=>setLogoFile(e.target.files[0])} />
              </div>
              <div className="profile-form-grid-box">
                <label>Cover</label>
                <input type="file" onChange={(e)=>setCoverFile(e.target.files[0])} />
              </div>          
              <input placeholder="اسم المحل" onChange={(e)=>setProfileName(e.target.value)} />
              <input placeholder="Bio" onChange={(e)=>setBio(e.target.value)} />
              <input placeholder="Phone" onChange={(e)=>setProfilePhone(e.target.value)} />
              <input placeholder="WhatsApp" onChange={(e)=>setWhatsapp(e.target.value)} />
              <input placeholder="Facebook link" onChange={(e)=>setFacebook(e.target.value)} />
              <input placeholder="Instagram link" onChange={(e)=>setInstagram(e.target.value)} />
              <input placeholder="Tiktok link" onChange={(e)=>setTiktop(e.target.value)} />
              <input placeholder="Address (optional)" onChange={(e)=>setAddress(e.target.value)} />
              <input placeholder="Map link (optional)" onChange={(e)=>setMapLink(e.target.value)} />
            </div>

            <div className="profile-form-grid-box" style={{marginTop:'15px',marginBottom:'15px'}}>
              <h3>Products</h3>
             <button
              onClick={() =>
                setProducts([...products, { name: "", price: 0, image: null }])
              }
            >
              + Add Product
            </button>
            </div>
            
            <div 
              className="profile-form-grid-box"
              style={{flexDirection:'column'}}
            >
            {products.map((p, i) => (
              <div key={i}>
                <input
                  placeholder="Product name"
                  onChange={(e)=>{
                    const newP=[...products];
                    newP[i].name=e.target.value;
                    setProducts(newP);
                  }}
                />
                <input
                  type="number"
                  placeholder="Price"
                  onChange={(e) => {
                    const newP = [...products];
                    newP[i].price = Number(e.target.value); // 🔥 always number
                    setProducts(newP);
                  }}
                />
                <input
                  type="file"
                  onChange={(e)=>{
                    const newP=[...products];
                    newP[i].image=e.target.files[0];
                    setProducts(newP);
                  }}
                />
              </div>
            ))}
            </div>

            <div className="profile-form-grid-box" style={{flexDirection:'row',marginTop:'15px'}}>
            {workingHours.map((dayObj, index) => (
              <div key={index} style={{ marginBottom: "10px" }}>
                <strong>{dayObj.day}</strong>

                <div>
                  <label>
                    <input
                      type="radio"
                      checked={dayObj.isOpen}
                      onChange={() => {
                        const newHours = [...workingHours];
                        newHours[index].isOpen = true;
                        setWorkingHours(newHours);
                      }}
                    />
                    Open
                  </label>

                  <label style={{ marginLeft: "10px" }}>
                    <input
                      type="radio"
                      checked={!dayObj.isOpen}
                      onChange={() => {
                        const newHours = [...workingHours];
                        newHours[index].isOpen = false;
                        newHours[index].open = "";
                        newHours[index].close = "";
                        setWorkingHours(newHours);
                      }}
                    />
                    Closed
                  </label>
                </div>

                {dayObj.isOpen && (
                  <div style={{ marginTop: "5px" }}>
                    <input
                      type="time"
                      value={dayObj.open}
                      onChange={(e) => {
                        const newHours = [...workingHours];
                        newHours[index].open = e.target.value;
                        setWorkingHours(newHours);
                      }}
                    />

                    <input
                      type="time"
                      value={dayObj.close}
                      onChange={(e) => {
                        const newHours = [...workingHours];
                        newHours[index].close = e.target.value;
                        setWorkingHours(newHours);
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
            </div>

            <div className="profile-form-grid-box">
              <button
                className="primary-btn"
                onClick={handleCreateProfile}
                disabled={creatingProfileLoading}
              >
                {creatingProfileLoading ? (
                  <ClipLoader size={18} color="#ffffff" />
                ) : (
                  "إنشاء البروفايل"
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
*/