import unittest
from playwright.sync_api import sync_playwright
from layout_check import CHECK_LAYOUT


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


if __name__=='__main__': unittest.main()
