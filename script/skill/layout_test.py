import unittest
from playwright.sync_api import sync_playwright
from layout_check import CHECK_LAYOUT, missing_text, CHECK_QUALITY
from PIL import Image


class LayoutGate(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw=sync_playwright().start()
        cls.browser=cls.pw.chromium.launch()
        cls.page=cls.browser.new_page(viewport={'width':1080,'height':1920})

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()

    def check(self,style):
        self.page.set_content(f'<div id="test-palco"><div style="position:absolute;left:72px;top:190px;font:74px/1 Georgia;width:936px;{style}">A readable title</div></div>')
        return self.page.evaluate(CHECK_LAYOUT,{'w':1080,'limit':1180})

    def test_visible_serif_glyphs_do_not_count_as_clipped_line_boxes(self):
        self.assertEqual(self.check('overflow:visible'),[])

    def test_real_clipping_is_rejected(self):
        self.assertTrue(self.check('height:20px;overflow:hidden'))

    def test_text_outside_safe_area_is_rejected(self):
        self.assertTrue(self.check('top:1170px'))

    def quality(self,body,opening=False):
        self.page.set_content(f'<div id="test-palco"><div id="test-barra" style="display:flex;position:absolute;left:72px;right:72px;top:72px;font:26px monospace;gap:36px"><span style="flex:1">Feature</span><span>04 / 07</span></div>{body}</div>')
        return self.page.evaluate(CHECK_QUALITY,{'w':1080,'limit':1180,'opening':opening})

    def test_small_empty_slide_fails_quality(self):
        self.assertIn('too much empty safe area',self.quality('<div style="position:absolute;top:190px;font-size:30px">Small title</div>'))
        self.assertIn('Short font below 44px',self.quality('<div style="position:absolute;top:190px;font-size:30px">Small title</div>'))

    def test_repeated_slide_text_fails_quality(self):
        result=self.quality('<div style="position:absolute;top:350px;font-size:70px">The agent revises based on feedback</div><div data-visual style="position:absolute;top:650px;font-size:48px">The agent revises based on feedback</div>')
        self.assertIn('repeated on-screen text',result)

    def test_wrapped_header_fails_quality(self):
        self.page.set_content('<div id="test-palco"><div id="test-barra" style="display:flex;width:300px;font:40px monospace"><span>Too long a label for this small space</span><span>04 / 07</span></div></div>')
        result=self.page.evaluate(CHECK_QUALITY,{'w':1080,'limit':1180})
        self.assertIn('label wraps or truncates',result)



class EncodedFrameGate(unittest.TestCase):
    def test_blank_encoded_field_is_rejected(self):
        image=Image.new('RGB',(40,40),(49,67,58))
        self.assertEqual(missing_text(image,[{'text':'Expected field','x':0,'y':0,'w':40,'h':40}]),['Expected field'])

    def test_template_ink_is_detected(self):
        image=Image.new('RGB',(40,40),(49,67,58))
        image.paste((238,245,240),(5,5,20,20))
        self.assertEqual(missing_text(image,[{'text':'Expected field','x':0,'y':0,'w':40,'h':40}]),[])


if __name__=='__main__': unittest.main()
