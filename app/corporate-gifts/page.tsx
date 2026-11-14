import { DetailHero, DetailShell } from "../components/detail-shell";
import { isProductionShowcase } from "../../lib/showcase-mode";
import { GiftConfigurator } from "../components/detail-interactions";
export default function CorporateGifts(){return <DetailShell><DetailHero chapter="05" kicker="KURUMSAL HEDİYELER" title="Bir kutudan fazlası." lead="Şirketinizin adını, Karacasu'nun köken hikâyesiyle buluşturan kişiselleştirilmiş premium setler." image="/altin-dal-gift-box.webp"/><section className="detail-section"><div className="section-heading"><p className="kicker">KUTUNUZU OLUŞTURUN</p><h2>Malzemeden etikete,<br/>size özel.</h2></div><GiftConfigurator showcase={isProductionShowcase()}/></section></DetailShell>}
