import { DetailHero, DetailShell } from "../components/detail-shell";
import { isProductionShowcase } from "../../lib/showcase-mode";
import { ClubSelector } from "../components/detail-interactions";
export default function OliveClub(){return <DetailShell><DetailHero chapter="04" kicker="BAHÇEDEN SOFRANIZA" title="Hasada daha yakın olun." lead="Düzenli gönderimler, üyelere özel hasatlar ve sahiplenebileceğiniz bir zeytin ağacı." image="/altin-dal-gift-box.webp"/><section className="detail-section"><div className="section-heading"><p className="kicker">OLIVE CLUB</p><h2>Size uygun ritmi seçin.</h2><p>Fiyatlar taslak üyelik fiyatlarıdır; abonelik ödeme altyapısı açılmadan tahsilat yapılmaz.</p></div><ClubSelector showcase={isProductionShowcase()}/></section></DetailShell>}
