#!/usr/bin/env python3
"""PPTX post-processing: fade transition, click-reveal of slide body (or explicit click steps), Manrope bullet font, duplicate pPr cleanup."""
import sys, re, zipfile, shutil, os

P14 = 'xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main"'
TRANS = f'<p:transition spd="med" p14:dur="400" {P14}><p:fade/></p:transition>'


def anim(groups):
    """Click animation. groups = list of shape-id lists; each group appears on its own click
    (first shape on the click, the rest fade in right after it)."""
    groups = [g for g in groups if g]
    if not groups:
        return ""
    cid = [2]
    def nid():
        cid[0] += 1
        return cid[0]
    clicks = []
    for g in groups:
        click_id = nid()
        inner = []
        t = 0
        for i, sid in enumerate(g):
            node = "clickEffect" if i == 0 else "afterEffect"
            dur = 400 if i == 0 else 250
            b, c = nid(), nid()
            inner.append(
                f'<p:par><p:cTn id="{b}" fill="hold"><p:stCondLst><p:cond delay="{t}"/></p:stCondLst><p:childTnLst>'
                f'<p:par><p:cTn id="{c}" presetID="10" presetClass="entr" presetSubtype="0" fill="hold" grpId="0" nodeType="{node}"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>'
                f'<p:set><p:cBhvr><p:cTn id="{nid()}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn><p:tgtEl><p:spTgt spid="{sid}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>'
                f'<p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="{nid()}" dur="{dur}"/><p:tgtEl><p:spTgt spid="{sid}"/></p:tgtEl></p:cBhvr></p:animEffect>'
                f'</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>')
            t += dur
        clicks.append(f'<p:par><p:cTn id="{click_id}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst><p:childTnLst>'
                      + "".join(inner) + '</p:childTnLst></p:cTn></p:par>')
    bld = "".join(f'<p:bldP spid="{s}" grpId="0"/>' for g in groups for s in g)
    return ('<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
            '<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>'
            + "".join(clicks) +
            '</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>'
            '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>'
            '</p:childTnLst></p:cTn></p:par></p:tnLst><p:bldLst>' + bld + '</p:bldLst></p:timing>')


def process(xml, animate, steps=None):
    xml = re.sub(r'<a:buFont typeface="[^"]*"[^/]*/>', '', xml)
    xml = xml.replace('<a:buChar ', '<a:buFont typeface="Manrope"/><a:buChar ')
    # удалить повторные a:pPr внутри одного абзаца
    def fixp(m):
        p = m.group(0)
        first = True
        def rep(mm):
            nonlocal first
            if first:
                first = False
                return mm.group(0)
            return ""
        return re.sub(r'<a:pPr\b[^>]*/>|<a:pPr\b[^>]*>.*?</a:pPr>', rep, p)
    xml = re.sub(r'<a:p>.*?</a:p>', fixp, xml, flags=re.S)
    xml = re.sub(r'<p:transition.*?</p:transition>|<p:timing>.*?</p:timing>', '', xml, flags=re.S)
    ins = TRANS
    if animate:
        ids = re.findall(r'<p:cNvPr id="(\d+)"', xml)
        ids = [i for i in ids if i != "1"]
        # ids[0] - заголовок, два последних - колонтитул
        if steps:   # explicit click steps from the builder: index ranges into the slide's objects
            ins += anim([ids[a:b] for a, b in steps])
        else:
            body = ids[1:-2]
            ins += anim([body])
    xml = xml.replace('</p:clrMapOvr>', '</p:clrMapOvr>' + ins, 1) if '</p:clrMapOvr>' in xml else xml.replace('</p:cSld>', '</p:cSld>' + ins, 1)
    return xml


def main(src, dst, no_anim_slides):
    tmp = dst + ".tmp"
    steps = {}
    side = src + ".anim.json"
    if os.path.exists(side):
        import json
        steps = {int(k): v for k, v in json.load(open(side)).items()}
    with zipfile.ZipFile(src) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            m = re.match(r'ppt/slides/slide(\d+)\.xml$', item.filename)
            if m:
                n = int(m.group(1))
                data = process(data.decode("utf8"), n not in no_anim_slides, steps.get(n)).encode("utf8")
            zout.writestr(item, data)
    shutil.move(tmp, dst)


if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]
    skip = set()
    if len(sys.argv) > 3 and sys.argv[3]:
        skip = {int(x) for x in sys.argv[3].split(",")}
    main(src, dst, skip)
