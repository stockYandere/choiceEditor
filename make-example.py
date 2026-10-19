"""Build the editable advanced example. Media is embedded for offline import/export."""
from pathlib import Path
import base64
import json

ROOT=Path(__file__).resolve().parent
MEDIA=ROOT/'example-media'
def uri(path,mime):
    return 'data:'+mime+';base64,'+base64.b64encode(path.read_bytes()).decode()
images={name:uri(MEDIA/(name+'.jpg'),'image/jpeg') for name in ['night','underpass','dawn','radio']}
def sound(name,volume=65,loop=False):
    return dict(src=uri(MEDIA/(name+'.mp3'),'audio/mpeg'),name=name+'.mp3',volume=volume,loop=loop)
def art(name,y=35,fit='cover'):
    return dict(image=images[name],y=y,fit=fit)
def choice(id,text,next='sequence',**kw):
    return dict(id='c_'+id,text=text,next=next,hp=kw.pop('hp',0),mental=kw.pop('mental',0),
                money=kw.pop('money',0),gain=kw.pop('gain',''),lose=kw.pop('lose',''),
                requires=kw.pop('requires',''),requiresCount=kw.pop('requiresCount',1),
                gainCount=kw.pop('gainCount',1),loseCount=kw.pop('loseCount',1),**kw)
def alternate(when,next='sequence',count=1,**kw):
    return dict(when=when,count=count,next=next,hp=kw.pop('hp',0),mental=kw.pop('mental',0),
                money=kw.pop('money',0),gain=kw.pop('gain',''),lose=kw.pop('lose',''),
                gainCount=kw.pop('gainCount',1),loseCount=kw.pop('loseCount',1),**kw)
events=[]
def scene(id,title,text,choices,kind='branch',mode='both',picture='night',speaker='유나',voice='voice-soft',bgm='keep',once=True):
    audio=dict(bgmMode=bgm)
    if voice:
        audio['dialogue']=sound(voice,45)
        # Ambience in the scene slot plays to its end; spoken lines stop when the player skips.
        if voice in ['rain','thunder','door','radio-static']: audio['dialogue']['kind']='effect'
    if bgm in ['night','tension','dawn']:
        audio.update(bgmMode='play',bgm=sound(bgm,32,True))
    e=dict(id=id,title=title,text=text,speaker=speaker,kind=kind,once=once,mode=mode,
           top=art(picture,28),bottom=art(picture,72),choices=choices,audio=audio)
    events.append(e)
    return e

# Only the six numbered anchors are story scenes. Encounter outcomes resume at
# the next anchor; inventory never participates in random scene selection.
scene('intro','1 · 카페가 닫히는 시간',
      '비가 그칠 줄 알았는데, 더 세졌네.\n\n막차 안내가 꺼진 밤. 카페 사장님은 창가에 작은 비상 가방을 두고 문을 닫았다.\n\n“언덕 위 쉼터까지 같이 갈래? 혼자 걷는 것보다 둘이 낫잖아.”\n\n유나는 접힌 우산을 펴다가 당신 쪽으로 조금 기울였다.',[
          choice('begin','유나와 함께 갈 준비를 한다','prepare')],kind='story',mode='full')
scene('prepare','준비 · 내가 잘하는 것',
      '너한테도 잘하는 게 있겠지?\n출발 전에 하나만 더 준비하자.\n\n오늘의 시작 능력 두 개는 가방에서 확인할 수 있어.',[
          choice('train_courage','겁나도 한 걸음 내딛는 연습','supplies',gain='courage'),
          choice('train_observe','위험 표지와 지도를 살핀다','supplies',gain='observe'),
          choice('train_aid','응급처치 안내를 읽는다','supplies',gain='aid'),
          choice('train_agile','젖은 바닥에서 균형을 잡는다','supplies',gain='agile')],mode='top')
scene('supplies','준비 · 비상 가방',
      '가방은 작아서 한 종류만 더 챙길 수 있어.\n붕대는 상처에, 간식은 긴장했을 때 쓸 수 있겠지.\n\n구석에 오래된 라디오도 놓여 있다. 사장님은 배터리값만 내라고 했다.',[
          choice('pack_bandage','붕대 두 개를 챙긴다','promise',gain='bandage',gainCount=2),
          choice('pack_snack','간식 두 개를 챙긴다','promise',gain='snack',gainCount=2),
          choice('pack_radio','배터리값을 내고 라디오를 가져간다','promise',money=-1,gain='radio'),
          choice('save_cash','물건 대신 비상 잔돈을 챙긴다','promise',money=1),
          choice('random_supply','남은 비상 물품에서 하나를 골라 챙긴다','promise',reward=dict(pool=['charm','negotiation','tea','bandage','snack'],count=1))],mode='bottom')
scene('promise','준비 · 우산 아래의 약속',
      '길에서 곤란한 사람을 만나면 어떻게 할까?\n\n유나가 물었다. 정답을 기대하는 얼굴은 아니었다.\n당신은 우산 손잡이를 고쳐 쥐었다.',[
          choice('promise_together','누군가를 돕더라도, 서로 놓치지 말자','sequence',gain='trust'),
          choice('promise_plan','먼저 안전한 길부터 확인하자','sequence',gain='observe'),
          choice('promise_bold','무슨 일이 있어도 앞으로 가자','sequence',gain='courage')])
scene('depart','2 · 첫 번째 골목',
      '카페의 불이 꺼졌다. 이제 언덕으로 올라가야 한다.\n\n물소리 사이로 발소리와 고양이 울음, 상점 셔터 소리가 섞여 들린다.\n무슨 일이 기다리고 있을지는 알 수 없다.',[
          choice('first_random','주변을 살피며 골목으로 들어간다','random'),
          choice('first_skip','큰길로 돌아 안전하게 걷는다','sequence')],kind='story',voice='rain')

scene('shelter','3 · 처마 밑의 휴식',
      '잠깐 쉬자. 지금 무리하면 끝까지 못 갈 것 같아.\n\n자동 세탁소의 처마가 작은 피난처가 되었다.\n유나는 가방을 내려놓고 손수건을 건넸다.',[
          choice('enter_rest','현재 상태를 살피고 쉬어 간다','heal')],kind='story')
scene('heal','휴식 · 회복과 상태 해제',
      '상처와 추위가 신경 쓰인다. 어떤 걸 먼저 돌볼까?\n\n쓸 물건이 없어도 잠깐 앉아 있을 수 있다.',[
          choice('heal_bandage','붕대로 상처를 감싼다','rest_talk',hp=2,lose='bandage'),
          choice('heal_skill','응급처치로 상처를 돌본다','rest_talk',hp=1,requires='aid'),
          choice('heal_snack','간식을 먹고 긴장을 푼다','rest_talk',mental=1,lose='snack'),
          choice('heal_dry','손수건으로 젖은 옷을 닦는다','rest_talk',mental=1,lose='wet'),
          choice('heal_free','물건은 아끼고 천천히 숨을 고른다','rest_talk',mental=1)])
scene('rest_talk','휴식 · 조금 가까워지는 시간',
      '오늘 처음 만난 사람하고 이런 데 앉아 있을 줄은 몰랐네.\n\n유나가 웃었다. 이야기를 나누거나, 라디오를 살펴볼 여유가 생겼다.',[
          choice('talk_trust','유나의 이야기를 끝까지 듣는다','sequence',gain='trust'),
          choice('talk_courage','서로 용기를 북돋아 준다','sequence',gain='courage'),
          choice('talk_aid','치료법을 다시 익힌다','sequence',gain='aid'),
          choice('talk_radio','라디오의 주파수를 맞춘다','radio_message',requires='radio'),
          choice('talk_wait','말없이 같은 비를 바라본다','sequence',mental=1),
          choice('talk_balance','집중해서 균형 잡는 법을 익힌다','sequence',requires='@mental',requiresCount=2,gain='agile')])
scene('rainwalk','4 · 빗소리가 바뀌는 곳',
      '빗방울이 굵어졌다. 반쯤 남은 길에는 아직 불이 켜진 곳도 있다.\n\n유나가 당신의 걸음에 속도를 맞췄다.\n한 곳만 더 살펴볼까, 곧장 쉼터로 갈까?',[
          choice('second_random','불빛이 보이는 길을 살핀다','random'),
          choice('second_skip','쉬지 않고 언덕 입구로 간다','sequence')],kind='story',voice='rain')
scene('gate','5 · 언덕으로 가는 두 길',
      '지하 통로는 짧지만 물이 불어 있다.\n육교는 멀어도 난간이 보인다.\n\n“어느 쪽이든 네 판단을 믿을게.”\n유나가 우산을 접었다. 바람이 너무 세졌다.',[
          choice('path_under','짧은 지하 통로를 살핀다','underpass'),
          choice('path_bridge','육교를 돌아 올라간다','bridge'),
          choice('path_radio','라디오의 안내를 확인한다','radio_message',requires='radio')],kind='story',picture='underpass',mode='full',voice='thunder',bgm='tension')
scene('arrival','6 · 쉼터의 불빛',
      '언덕 위에 도착했을 때, 하늘 끝이 조금 밝아졌다.\n\n오늘 밤 주운 것, 잃은 것, 함께 견딘 것이 가방에 남아 있다.\n유나는 당신을 바라보며 말했다.\n\n“이제 어디로 갈까?”',[
          choice('end_bond','유나와 다음 만남을 약속한다','ending_bond',requires='trust',requiresCount=2),
          choice('end_cat','구한 고양이와 아침을 맞는다','ending_cat',requires='cat'),
          choice('end_key','비밀 열쇠로 옥상 정원을 연다','ending_secret',lose='key'),
          choice('end_cash','남은 돈으로 둘의 아침을 산다','ending_breakfast',money=-3,requires='@money',requiresCount=3),
          choice('end_brave','새벽 첫차까지 함께 걷는다','ending_brave',requires='courage',requiresCount=2),
          choice('end_normal','쉼터에서 쉬고 각자의 길로 간다','ending_normal')],kind='story',picture='dawn',mode='full',voice='voice-happy',bgm='dawn')

# Random pool: six one-time episodes plus one repeatable atmosphere episode.
scene('enc_cat','랜덤 · 배수구의 고양이',
      '작은 울음이 배수구에서 들린다.\n주황색 고양이의 앞발이 철망 사이에 끼었다.\n\n“겁주면 더 깊이 숨어 버릴 것 같아.”',[
          choice('cat_observe','발이 걸린 방향을 보고 철망을 든다','cat_rescued',requires='observe'),
          choice('cat_snack','간식으로 고양이를 천천히 유인한다','cat_rescued',lose='snack'),
          choice('cat_rush','손을 뻗어 바로 구한다','cat_scratched',hp=-1,branch=alternate('agile','cat_rescued')),
          choice('cat_leave','구조 위치를 신고하고 이동한다','sequence')],kind='encounter')
scene('cat_scratched','고양이 · 손등의 상처',
      '놀란 고양이가 손등을 할퀴었다. 그래도 철망 밖으로 꺼냈다.\n\n유나는 당신의 손을 살피고, 고양이를 코트 안에 안았다.',[
          choice('cat_treated','붕대로 손등을 감싼다','cat_rescued',hp=1,lose='bandage'),
          choice('cat_ignore','상처는 나중에 돌본다','cat_rescued')],voice='voice-worried')
scene('cat_rescued','고양이 · 작은 동행',
      '고양이가 유나의 코트 안에서 몸을 웅크렸다.\n\n“얘도 같이 가고 싶나 봐.”\n작은 심장 소리가 빗소리보다 가까이 들렸다.',[
          choice('cat_gain','새로운 동행을 받아들인다','sequence',gain='cat',mental=1)])
scene('enc_vendor','랜덤 · 닫히기 직전의 상점',
      '상점 주인이 셔터를 내리다 당신들을 보고 멈췄다.\n\n“비상용으로 남겨 둔 게 있어. 필요한 것 하나만 골라.”',[
          choice('shop_bandage','붕대 두 개를 산다',money=-1,gain='bandage',gainCount=2),
          choice('shop_snack','간식 두 개를 산다',money=-1,gain='snack',gainCount=2),
          choice('shop_radio','남은 라디오를 산다',money=-2,gain='radio'),
          choice('shop_none','고맙다고 인사하고 지나간다')],kind='encounter',mode='top')
scene('enc_wallet','랜덤 · 물웅덩이의 지갑',
      '가로등 아래에 지갑 하나가 떠 있다.\n젖은 사진 뒤에 연락처가 적혀 있다.\n\n유나는 잠시 당신의 결정을 기다렸다.',[
          choice('wallet_return','주인에게 연락하고 돌려준다','wallet_return',requires='observe'),
          choice('wallet_police','가까운 보관함에 맡긴다',gain='trust'),
          choice('wallet_cash','비상 잔돈만 가져간다',money=2,mental=-1),
          choice('wallet_leave','건드리지 않고 지나간다')],kind='encounter',mode='bottom')
scene('wallet_return','지갑 · 보답의 열쇠',
      '지갑 주인은 언덕 쉼터 관리인이었다.\n\n“라디오에서 옥상 얘기를 들으면 이 열쇠를 써요.\n사진을 잃어버리지 않아서 정말 다행이네요.”',[
          choice('wallet_key','옥상 열쇠를 받아 든다','sequence',gain='key',money=1)])
scene('enc_injured','랜덤 · 멈춰 선 자전거',
      '넘어진 자전거 옆에서 배달원이 팔을 붙잡고 있다.\n\n“신고는 했어요. 구급차 올 때까지만 봐 줄 수 있나요?”',[
          choice('injury_skill','압박점을 찾아 지혈을 돕는다','help_reward',requires='aid'),
          choice('injury_bandage','붕대 두 개로 단단히 감아 준다','help_reward',lose='bandage',loseCount=2),
          choice('injury_wait','가진 붕대가 충분하면 쓰고, 곁을 지킨다','help_reward',mental=-1,branch=alternate('bandage','help_reward',count=2,lose='bandage',loseCount=2,gain='trust')),
          choice('injury_leave','신고 위치를 확인하고 먼저 이동한다')],kind='encounter',voice='voice-worried')
scene('help_reward','자전거 · 작은 보답',
      '구급차 불빛이 골목으로 들어왔다.\n\n배달원은 남아 있던 간식을 건넸다.\n“오늘 같은 날, 누가 멈춰 줬다는 게 기억에 남겠네요.”',[
          choice('help_snack','간식을 받고 다시 길을 걷는다','sequence',gain='snack',gainCount=2)])
scene('enc_dark','랜덤 · 정전된 계단',
      '천둥과 함께 계단의 조명이 꺼졌다.\n\n바닥에서 유리가 부서지는 소리가 났다.\n유나가 당신의 소매를 잡았다.',[
          choice('dark_brave','유나를 안심시키며 앞장선다','dark_safe',requires='courage'),
          choice('dark_observe','번개가 비출 때 발 디딜 곳을 기억한다','dark_safe',requires='observe'),
          choice('dark_run','망설이지 않고 뛰어 내려간다','dark_safe',hp=-1,mental=-1,branch=alternate('agile','dark_safe',mental=-1)),
          choice('dark_detour','긴 길로 돌아간다',mental=-1,branch=alternate('@mental',count=3))],kind='encounter',picture='underpass',mode='full',voice='thunder',bgm='tension')
scene('dark_safe','계단 · 맞잡은 손',
      '계단 끝에는 아직 불이 켜져 있었다.\n\n“아까 조금 무서웠어. 손 잡아 줘서 고마워.”\n유나는 놓았던 손을 한 번 더 잡았다.',[
          choice('dark_trust','괜찮다고 대답한다','sequence',gain='trust')])
scene('enc_radio','랜덤 · 잡음 속의 신호',
      '상점 앞의 버려진 라디오에서 미약한 신호가 들린다.\n\n누군가 쉼터의 비상 주파수를 반복해서 보내고 있다.',[
          choice('radio_observe','주파수 숫자를 기억하고 조율한다','radio_message',requires='observe',gain='radio'),
          choice('radio_battery','새 배터리를 끼워 켠다','radio_message',money=-1,gain='radio'),
          choice('radio_skip','신호 위치만 신고하고 이동한다')],kind='encounter',picture='radio',mode='top',voice='radio-static')
scene('enc_rain','랜덤 · 다시 만난 빗소리',
      '천막 아래에서 빗소리가 잠깐 달라졌다.\n\n이 길을 다시 지나도 비는 같은 속도로 내린다.\n걷는 사람의 마음만 조금씩 달라진다.',[
          choice('rain_rest','잠깐 멈추고 마음을 가라앉힌다',mental=1),
          choice('rain_push','비를 맞으며 계속 걷는다',gain='wet',mental=-1),
          choice('rain_share','우산을 유나 쪽으로 더 기울인다',gain='trust')],kind='encounter',once=False,voice='rain')
scene('radio_message','라디오 · 알려지지 않은 길',
      '“지하 통로는 통제 중. 언덕 입구의 비상함을 확인하세요.”\n\n신호를 따라가니 비상함 안에 옥상 열쇠가 있다.\n곁에는 물이 불어난 통로의 경고 그림도 붙어 있다.',[
          choice('radio_key','열쇠를 챙기고 안내된 길로 간다','radio_detour',gain='key'),
          choice('radio_trust','열쇠는 두고, 유나와 안내를 기억한다','radio_detour',gain='trust')],picture='radio',voice='radio-static')
scene('radio_detour','라디오 · 안전한 우회',
      '신호가 알려 준 길에는 낮은 난간이 있었다.\n이 길이라면 물을 건너지 않아도 된다.\n\n라디오를 끄자, 다시 두 사람의 발소리만 들렸다.',[
          choice('radio_resume','안전한 길을 따라 다음 구간으로 간다','sequence')],voice='door',bgm='night')

scene('underpass','통로 · 물 아래의 위험',
      '검은 물이 발목을 넘었다. 출구는 가까운데 바닥이 보이지 않는다.\n\n“여긴 그냥 건너도 되는 걸까?”\n천장에서 물방울이 떨어졌다.',[
          choice('under_observe','물살과 난간을 살펴 길을 고른다','cross_safe',requires='observe',requiresCount=2),
          choice('under_agile','난간을 잡고 균형을 유지한다','cross_safe',requires='agile'),
          choice('under_force','힘으로 버티며 물을 건넌다','cross_hurt',hp=-2,gain='wet',branch=alternate('courage','cross_hurt',count=2,hp=-1,gain='wet')),
          choice('under_return','돌아 나와 육교로 간다','bridge'),
          choice('under_fatal','급류 속으로 뛰어든다','sequence',hp=-3,ignoreEffects=True)],picture='underpass',mode='full',voice='rain',bgm='tension')
scene('cross_hurt','통로 · 젖은 소매',
      '발을 헛디뎠다. 난간을 잡고 빠져나왔지만 팔이 긁혔다.\n유나가 젖은 소매를 걷었다.\n\n“남은 붕대 있으면 지금 쓰자.”',[
          choice('cross_treat','붕대를 사용한다','cross_safe',hp=2,lose='bandage'),
          choice('cross_aid','응급처치로 버틸 만큼 돌본다','cross_safe',hp=1,requires='aid'),
          choice('cross_wait','쉬면서 숨을 고른다','cross_safe',mental=1)],picture='underpass',voice='voice-worried')
scene('cross_safe','통로 · 출구의 손',
      '출구에서 유나가 손을 내밀었다.\n\n“이제 정말 조금 남았어.”\n당신은 그 손을 잡고 마지막 계단을 올랐다.',[
          choice('cross_finish','맞잡은 손을 놓지 않는다','sequence',gain='trust')],bgm='night')
scene('bridge','육교 · 흔들리는 발판',
      '바람에 육교가 울렸다. 빗물 때문에 발판도 미끄럽다.\n\n멀리 쉼터 불빛이 보인다.\n유나가 조용히 숨을 세고 있었다.',[
          choice('bridge_agile','발판의 움직임에 맞춰 걷는다','bridge_safe',requires='agile'),
          choice('bridge_resource','몸을 낮추고 난간을 잡는다','bridge_safe',requires='@hp',requiresCount=2,hp=-1,branch=alternate('@hp','bridge_safe',count=3)),
          choice('bridge_brave','두려움을 삼키고 앞장선다','bridge_safe',mental=-2,branch=alternate('courage','bridge_safe',count=2,mental=-1)),
          choice('bridge_wait','바람이 약해질 때까지 기다린다','bridge_safe',mental=-1),
          choice('bridge_panic','난간을 놓고 어둠 속으로 달린다','sequence',mental=-3,ignoreEffects=True)],picture='underpass',mode='both',voice='voice-worried',bgm='tension')
scene('bridge_safe','육교 · 숨을 돌리는 곳',
      '육교를 내려오자, 간판 뒤에서 바람이 잠잠해졌다.\n\n“네가 옆에 있으니까 생각보다 버틸 만했어.”\n유나가 작은 간식을 반으로 나눴다.',[
          choice('bridge_recover','간식을 나눠 먹는다','final_pause',mental=1),
          choice('bridge_bond','함께 버틴 일을 웃으며 이야기한다','final_pause',gain='trust')],bgm='night')
scene('final_pause','도착 전 · 마지막 선택',
      '언덕 입구의 문은 아직 닫혀 있다.\n\n길을 다시 살펴볼 시간은 있지만, 지금도 쉼터로 갈 수 있다.\n더 찾는다면 남은 체력과 마음을 확인하는 편이 좋겠다.',[
          choice('last_random','주변 골목을 한 번 더 살핀다','random'),
          choice('last_rest','유나와 문이 열리기를 기다린다','sequence',mental=1)],voice='rain')

endings=[
 ('ending_bond','엔딩 · 다음 비에도 함께','비가 그쳤는데도 유나는 우산을 접지 않았다.\n\n“다음엔 비 안 오는 날 만나자. 그래도 이 우산은 가져갈게.”\n\n당신들은 연락처를 나누고, 오늘 밤의 약속을 내일로 옮겼다.\n\n함께 걷는 길이 하나 더 생겼다.'),
 ('ending_cat','엔딩 · 셋이 맞는 아침','고양이는 옥상 벤치에 먼저 자리를 잡았다.\n유나는 졸고 있는 작은 등을 쓰다듬었다.\n\n“집에 가는 길에 얘 이름부터 정하자.”\n\n오늘의 귀갓길은 두 사람이 아니라 셋의 이야기가 되었다.'),
 ('ending_secret','엔딩 · 비밀 정원의 주파수','열쇠가 돌아가자 옥상 문이 열렸다.\n비에 씻긴 화분 사이로 햇빛이 흘렀다.\n\n누군가 라디오에 남긴 마지막 안내는 짧았다.\n“오늘 도착한 사람들에게, 따뜻한 아침을.”\n\n유나가 종이컵 하나를 당신에게 건넸다.'),
 ('ending_breakfast','엔딩 · 두 잔의 온기','남은 잔돈은 따뜻한 커피 두 잔과 빵 하나가 되었다.\n\n유나는 빵을 반으로 나누다가 웃었다.\n“돈 쓴 것보다, 누구랑 먹었는지가 오래 기억날 것 같아.”\n\n짧은 밤이 느긋한 아침으로 이어졌다.'),
 ('ending_brave','엔딩 · 첫차보다 먼저','쉼터에 앉는 대신 새벽 거리를 함께 걸었다.\n\n무서웠던 밤에도 멈추지 않았던 발걸음이, 이제는 가벼웠다.\n유나는 정류장 앞에서 당신의 이름을 한 번 불렀다.\n\n“오늘 용기 내 줘서 고마워. 다음엔 내가 먼저 말 걸게.”'),
 ('ending_normal','엔딩 · 무사히 도착한 밤','쉼터의 불빛 아래에서 두 사람은 잠시 말이 없었다.\n\n대단한 약속이나 발견이 없어도, 무사히 도착했다는 사실은 남았다.\n\n“잘 들어가. 오늘 같이 걸어 줘서 고마웠어.”\n\n밖에는 비가 그친 거리와, 다시 시작할 수 있는 아침이 있었다.')]
for id,title,text in endings:
    scene(id,title,text,[choice(id+'_finish','오늘 밤의 이야기를 마친다','end')],picture='dawn',mode='full',voice='voice-happy',bgm='dawn')

definitions=[
 dict(id='courage',name='용기',type='ability',initial=0,image=images['night'],imageX=23,imageY=35,sound=sound('voice-happy',65)),
 dict(id='observe',name='관찰력',type='ability',initial=0,sound=sound('voice-soft',60)),
 dict(id='aid',name='응급처치',type='ability',initial=0),
 dict(id='agile',name='균형 감각',type='ability',initial=0),
 dict(id='charm',name='보호 부적',type='item',initial=0,highlight=True,effects=[dict(kind='hpLoss',amount=1),dict(kind='mentalLoss',amount=1,**{'with':'courage'})]),
 dict(id='negotiation',name='흥정',type='ability',initial=0,effects=[dict(kind='moneyLoss',amount=1)]),
 dict(id='tea',name='차의 온기',type='state',initial=0,effects=[dict(kind='mentalGain',amount=1)]),
 dict(id='bandage',name='붕대',type='item',initial=0,sound=sound('bandage')),
 dict(id='snack',name='간식',type='item',initial=0),
 dict(id='radio',name='비상 라디오',type='item',initial=0,image=images['radio'],imageX=50,imageY=48,highlight=True,sound=sound('radio-found',75)),
 dict(id='key',name='옥상 열쇠',type='item',initial=0,image=images['radio'],imageX=68,imageY=92,highlight=True,sound=sound('key-found',70)),
 dict(id='wet',name='흠뻑 젖음',type='state',initial=0),
 dict(id='trust',name='신뢰',type='state',initial=0,sound=sound('bond',60)),
 dict(id='cat',name='작은 동행',type='state',initial=0,image=images['dawn'],imageX=68,imageY=91,highlight=True,sound=sound('cat',70))]

project=dict(format='event-vn',version=1,title='랜덤 보상 예제 · 비가 그치기 전',hp=3,maxHp=3,
             mental=3,money=2,randomStart=2,definitions=definitions,events=events,
             sampleImage=images['night'],audio=dict(bgm=sound('night',30,True),effects={}))
for cue in ['ability','item','state','money','important','recovery','loss','death','mixed']:
    project['audio']['effects'][cue]=dict(src=uri(ROOT/'assets/sfx'/(cue+'.wav'),'audio/wav'),name=cue+'-example.wav',volume=55)
# Authored silence and nonlooping scene music are both used in the example.
next(e for e in events if e['id']=='radio_message')['audio']['bgmMode']='stop'
next(e for e in events if e['id']=='promise')['audio'].update(bgmMode='play',bgm=sound('night',27,False))
# Actual different top/bottom artwork, cover/contain and intentional empty half.
e=next(e for e in events if e['id']=='shelter');e['bottom']=art('radio',55)
next(e for e in events if e['id']=='prepare')['bottom']={'empty':True}
next(e for e in events if e['id']=='supplies')['top']={'empty':True}
image_bank=list(dict.fromkeys(images.values()))
audio_bank=[]
def compact(value):
    if isinstance(value,dict):return {k:compact(v) for k,v in value.items()}
    if isinstance(value,list):return [compact(v) for v in value]
    if isinstance(value,str) and value.startswith('data:image/'):
        return '@example-image:'+str(image_bank.index(value))
    if isinstance(value,str) and value.startswith('data:audio/'):
        if value not in audio_bank:audio_bank.append(value)
        return '@example-sound:'+str(audio_bank.index(value))
    return value
body=json.dumps(compact(project),ensure_ascii=False,separators=(',',':'))
js='globalThis.ADVANCED_SAMPLE=(()=>{const pictures='+json.dumps(image_bank)+',sounds='+json.dumps(audio_bank)+';return JSON.parse('+json.dumps(body,ensure_ascii=False)+",(k,v)=>typeof v==='string'&&v.startsWith('@example-image:')?pictures[Number(v.slice(15))]:typeof v==='string'&&v.startsWith('@example-sound:')?sounds[Number(v.slice(15))]:v);})();\n"
STAGES={"intro": {"mood": "night", "moodStrength": 60, "weather": "rain", "weatherAmount": 2, "camera": "panRight", "cameraSpeed": "slow", "overlays": ["vignette"], "transition": "blackFade"}, "depart": {"mood": "neon", "moodStrength": 50, "weather": "rain", "weatherAmount": 2, "camera": "drift", "overlays": ["vignette"], "transition": "fade"}, "shelter": {"mood": "dusk", "moodStrength": 60, "weather": "rain", "weatherAmount": 1, "overlays": ["haze", "glow"], "camera": "breathe", "transition": "fade"}, "rest_talk": {"mood": "dawn", "moodStrength": 50, "weather": "fireflies", "weatherAmount": 1, "overlays": ["glow"], "camera": "breathe", "beats": [{"when": "gain", "fx": "pulse"}]}, "rainwalk": {"mood": "night", "weather": "storm", "weatherAmount": 3, "camera": "sway", "overlays": ["vignette"], "transition": "flashCut", "beats": [{"when": "start", "fx": "lightning"}]}, "enc_dark": {"mood": "horror", "moodStrength": 80, "overlays": ["grain", "vignette"], "warp": "wobble", "camera": "tilt", "transition": "blackFade", "beats": [{"when": "start", "fx": "lightning"}, {"when": "loss", "fx": "redFlash"}]}, "enc_radio": {"mood": "faded", "overlays": ["scanlines", "grain"], "transition": "glitch", "beats": [{"when": "start", "fx": "glitch"}]}, "underpass": {"mood": "cold", "warp": "water", "weather": "bubbles", "weatherAmount": 2, "overlays": ["vignette"], "camera": "zoomIn", "cameraSpeed": "slow", "beats": [{"when": "loss", "fx": "bigShake"}, {"when": "loss", "fx": "redFlash"}]}, "cross_hurt": {"mood": "danger", "moodStrength": 60, "beats": [{"when": "start", "fx": "redFlash"}, {"when": "start", "fx": "shake"}]}, "bridge": {"mood": "night", "weather": "storm", "weatherAmount": 2, "camera": "sway", "cameraSpeed": "fast", "overlays": ["letterbox"], "beats": [{"when": "loss", "fx": "bigShake"}]}, "enc_cat": {"mood": "day", "moodStrength": 40, "camera": "breathe", "beats": [{"when": "gain", "fx": "pulse"}]}, "wallet_return": {"overlays": ["glow"], "beats": [{"when": "gain", "fx": "whiteFlash"}]}, "arrival": {"mood": "dawn", "overlays": ["lightRays", "haze"], "camera": "zoomOut", "cameraSpeed": "slow", "transition": "whiteFade"}, "ending_bond": {"mood": "dawn", "weather": "petals", "weatherAmount": 1, "overlays": ["glow"], "camera": "breathe", "transition": "whiteFade"}, "ending_secret": {"mood": "vivid", "weather": "sparkles", "weatherAmount": 2, "overlays": ["glow", "lightRays"], "transition": "iris"}, "ending_brave": {"mood": "dawn", "overlays": ["lightRays"], "camera": "panUp", "cameraSpeed": "slow", "transition": "whiteFade"}, "ending_normal": {"mood": "memory", "moodStrength": 50, "overlays": ["vignette", "grain"], "transition": "fade"}}
js+="\n// Example staging (연출) on a few scenes; all drawn in code over the existing pictures.\n(()=>{const stages="+json.dumps(STAGES,ensure_ascii=False)+";for(const e of globalThis.ADVANCED_SAMPLE.events)if(stages[e.id])e.stage=stages[e.id];})();\n"
(ROOT/'test-fixtures/advanced-sample.js').write_text(js)  # test data only; no longer bundled in the app (v0.1.50)
print('Built',len(events),'scenes,',len(definitions),'definitions;',round(len(js)/1e6,2),'MB JS')
